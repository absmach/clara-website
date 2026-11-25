// Clara website API. Runs only for /api/* (assets.runWorkerFirst); every other
// request is served from the static site.
//
//   POST /api/early-access  Turnstile check, then a Listmonk subscriber on the
//                           Clara early-access list and a thank-you email.
//   POST /api/contact       Turnstile check, then a Listmonk transactional email
//                           to the team inbox with Reply-To set to the visitor.
//                           The visitor is not stored as a subscriber.

import { CONTACT_TOPICS, NOTICE_VERSION } from "./forms.js";

const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const handler = { "/api/early-access": earlyAccess, "/api/contact": contact }[pathname];
    if (!handler) return json({ error: "Not found." }, 404);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
    return handler(request, env, ctx);
  },
};

async function earlyAccess(request, env, ctx) {
  const listId = Number(env.LISTMONK_LIST_ID);
  if (!env.TURNSTILE_SECRET || !env.LISTMONK_API_TOKEN || !(listId > 0)) {
    console.error("early access is missing configuration");
    return json({ error: "Early access requests aren’t available here right now." }, 503);
  }

  const body = await readBody(request);
  if (!body) return json({ error: "Invalid request." }, 400);
  // Real visitors never see or fill this field.
  if (str(body.website) !== "") return json({ ok: true });

  const request_ = parseEarlyAccess(body);
  if (!request_) return json({ error: "Check your answers and try again." }, 400);

  if (!(await verifyTurnstile(body.turnstileToken, "early_access", request, env))) {
    return json({ error: "We couldn’t verify this request. Please try again." }, 403);
  }

  const outcome = await saveSubscriber(request_, listId, env);
  if (!outcome) return json({ error: "We couldn’t save your request. Please try again." }, 502);
  if (outcome === "unsubscribed") {
    return json({ error: "This address can’t be added through this form. Email info@absmach.eu and we’ll help." }, 409);
  }

  // Someone already on the list doesn't get a second thank-you email.
  if (outcome !== "already") ctx.waitUntil(sendThanks(request_.email, env));
  return json({ ok: true });
}

async function contact(request, env) {
  const templateId = Number(env.LISTMONK_CONTACT_TEMPLATE_ID);
  if (!env.TURNSTILE_SECRET || !env.LISTMONK_API_TOKEN || !(templateId > 0) || !env.LISTMONK_CONTACT_EMAIL) {
    console.error("contact is missing configuration");
    return json({ error: "The contact form isn’t available here right now." }, 503);
  }

  const body = await readBody(request);
  if (!body) return json({ error: "Invalid request." }, 400);
  if (str(body.website) !== "") return json({ ok: true });

  const message = parseContact(body);
  if (!message) return json({ error: "Check your answers and try again." }, 400);

  if (!(await verifyTurnstile(body.turnstileToken, "contact", request, env))) {
    return json({ error: "We couldn’t verify this request. Please try again." }, 403);
  }

  const sent = await sendTx(env, {
    subscriber_email: env.LISTMONK_CONTACT_EMAIL,
    template_id: templateId,
    // Replies from the inbox go straight to the visitor. The address is
    // validated by EMAIL_RE, which rejects whitespace and line breaks.
    headers: [{ "Reply-To": message.email }],
    data: message,
  });
  if (!sent) return json({ error: "We couldn’t send your message. Please try again." }, 502);
  return json({ ok: true });
}

function parseEarlyAccess(body) {
  if (body.noticeVersion !== NOTICE_VERSION) return null;
  const name = str(body.name);
  const email = str(body.email);
  const product = str(body.product);
  const goal = str(body.goal);
  if (!name || name.length > 100) return null;
  if (!isEmail(email)) return null;
  if (!product || product.length > 180) return null;
  if (goal.length > 1800) return null;

  // Listmonk is shared with other Abstract Machines products, so Clara's
  // answers live under their own key and never overwrite another product's.
  const clara = {
    product,
    goal,
    source: "website",
    requested_at: new Date().toISOString(),
    notice_version: NOTICE_VERSION,
    permission: "early_access_and_related_emails",
  };
  for (const key of UTM_KEYS) {
    const value = str(body[key]).slice(0, 100);
    if (value) clara[key] = value;
  }
  return { name, email, attribs: { clara } };
}

function parseContact(body) {
  if (body.noticeVersion !== NOTICE_VERSION) return null;
  const name = str(body.name);
  const email = str(body.email);
  const company = str(body.company);
  const message = str(body.message);
  if (!name || name.length > 100) return null;
  if (!isEmail(email)) return null;
  if (company.length > 180) return null;
  if (!Object.hasOwn(CONTACT_TOPICS, body.topic)) return null;
  if (!message || message.length > 5000) return null;
  return {
    name,
    email,
    company,
    topic: CONTACT_TOPICS[body.topic],
    message,
    submitted_at: new Date().toISOString(),
  };
}

// Fails closed on any error. Tokens are single-use, so replays fail too.
async function verifyTurnstile(token, action, request, env) {
  const hostnames = (env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  token = str(token);
  if (token === "" || token.length > 2048 || hostnames.length === 0) return false;

  const params = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) params.set("remoteip", ip);

  try {
    const res = await fetch(TURNSTILE_URL, { method: "POST", body: params, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return false;
    const result = await res.json();
    // Cloudflare's test secret (local runs only) returns no action. A real
    // secret never produces a test result, so this can't relax production.
    const actionOk = result.action === action || result.metadata?.result_with_testing_key === true;
    return result.success === true && actionOk && hostnames.includes(result.hostname);
  } catch (err) {
    console.error("turnstile verification failed", err);
    return false;
  }
}

function listmonk(env, path, init = {}) {
  return fetch(`${env.LISTMONK_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${env.LISTMONK_API_USER}:${env.LISTMONK_API_TOKEN}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
}

// Returns "created", "added" (existing address joined our list), "already"
// (it was on our list), "unsubscribed", or false on failure.
async function saveSubscriber({ email, name, attribs }, listId, env) {
  try {
    const res = await listmonk(env, "/subscribers", {
      method: "POST",
      body: JSON.stringify({ email, name, status: "enabled", lists: [listId], attribs, preconfirm_subscriptions: true }),
    });
    if (res.status === 409) return await updateExisting(email, attribs, listId, env);
    if (!res.ok) console.error("listmonk create failed", res.status);
    return res.ok && "created";
  } catch (err) {
    console.error("listmonk create error", err);
    return false;
  }
}

// The address is already in Listmonk, from another list or an earlier request.
// Add it to our list and refresh Clara's answers, leaving its other lists and
// attributes alone.
async function updateExisting(email, attribs, listId, env) {
  const search = await listmonk(env, `/subscribers?search=${encodeURIComponent(email)}`);
  if (!search.ok) {
    console.error("listmonk search failed", search.status);
    return false;
  }
  const { data } = await search.json();
  const existing = data?.results?.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error("existing subscriber not visible to the API user");
    return false;
  }
  if (existing.status === "blocklisted") return "already";
  // A public form can't prove mailbox ownership, so it never reverses a withdrawal.
  if (existing.lists.some((l) => l.id === listId && l.subscription_status === "unsubscribed")) {
    return "unsubscribed";
  }

  const wasOnList = existing.lists.some((l) => l.id === listId);
  const lists = new Set(existing.lists.filter((l) => l.subscription_status !== "unsubscribed").map((l) => l.id));
  lists.add(listId);

  const res = await listmonk(env, `/subscribers/${existing.id}`, {
    method: "PUT",
    body: JSON.stringify({
      email: existing.email,
      name: existing.name,
      status: existing.status,
      lists: [...lists],
      attribs: { ...existing.attribs, ...attribs },
      preconfirm_subscriptions: true,
    }),
  });
  if (!res.ok) console.error("listmonk update failed", res.status);
  return res.ok && (wasOnList ? "already" : "added");
}

// Best effort: a failed thank-you email never fails the signup. Skipped until
// a template ID is configured.
async function sendThanks(email, env) {
  const templateId = Number(env.LISTMONK_WELCOME_TEMPLATE_ID);
  if (!(templateId > 0)) return;
  await sendTx(env, { subscriber_email: email, template_id: templateId });
}

async function sendTx(env, message) {
  try {
    const res = await listmonk(env, "/tx", {
      method: "POST",
      body: JSON.stringify({ from_email: env.LISTMONK_FROM_EMAIL, content_type: "html", ...message }),
    });
    if (!res.ok) console.error("listmonk tx failed", message.template_id, res.status);
    return res.ok;
  } catch (err) {
    console.error("listmonk tx error", message.template_id, err);
    return false;
  }
}

async function readBody(request) {
  if (Number(request.headers.get("Content-Length")) > 16_384) return null;
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function isEmail(value) {
  return value.length <= 254 && EMAIL_RE.test(value);
}

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
