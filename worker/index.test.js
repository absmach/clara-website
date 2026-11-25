import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import worker from "./index.js";
import { NOTICE_VERSION } from "./forms.js";

const env = {
  LISTMONK_URL: "https://mail.example",
  LISTMONK_API_USER: "clara-website",
  LISTMONK_API_TOKEN: "secret-token",
  LISTMONK_LIST_ID: "12",
  LISTMONK_WELCOME_TEMPLATE_ID: "5",
  LISTMONK_CONTACT_TEMPLATE_ID: "6",
  LISTMONK_CONTACT_RECEIPT_TEMPLATE_ID: "7",
  LISTMONK_CONTACT_EMAIL: "inbox@example.com",
  LISTMONK_FROM_EMAIL: "Clara <hello@example.com>",
  TURNSTILE_SECRET: "turnstile-secret",
  TURNSTILE_HOSTNAMES: "claragtm.com,www.claragtm.com",
};

const signup = {
  name: "Ada Obi",
  email: "ada@example.com",
  product: "Fieldnotes",
  goal: "Release notes and LinkedIn posts.",
  website: "",
  turnstileToken: "token",
  noticeVersion: NOTICE_VERSION,
};

const message = {
  name: "Ada Obi",
  email: "ada@example.com",
  company: "Fieldnotes",
  topic: "partnerships",
  message: "Could we talk about a partnership?",
  website: "",
  turnstileToken: "token",
  noticeVersion: NOTICE_VERSION,
};

const turnstile = (action) => reply({ success: true, action, hostname: "claragtm.com" });

const realFetch = globalThis.fetch;
let calls;
let responders;
let background;

// Each responder answers one outbound request, in order.
beforeEach(() => {
  calls = [];
  responders = [];
  background = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: parse(init?.body) });
    const respond = responders.shift();
    assert.ok(respond, `unexpected request to ${url}`);
    return respond();
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function parse(body) {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const reply = (body, status = 200) => () => Response.json(body, { status });
// Collects work handed to ctx.waitUntil, such as the thank-you email.
const ctx = { waitUntil: (promise) => background.push(promise) };

async function post(path, body, { method = "POST", config = env } = {}) {
  const request = new Request(`https://claragtm.com${path}`, {
    method,
    headers: { "CF-Connecting-IP": "203.0.113.7" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  const res = await worker.fetch(request, config, ctx);
  await Promise.all(background);
  return res;
}

test("unknown API paths answer 404", async () => {
  assert.equal((await post("/api/nope", {})).status, 404);
});

test("only POST is accepted", async () => {
  for (const path of ["/api/early-access", "/api/contact"]) {
    const res = await post(path, null, { method: "GET" });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("Allow"), "POST");
  }
});

// Early access

test("early access answers 503 until it is configured, as on PR previews", async () => {
  for (const patch of [{ LISTMONK_LIST_ID: "0" }, { TURNSTILE_SECRET: undefined }, { LISTMONK_API_TOKEN: "" }]) {
    const res = await post("/api/early-access", signup, { config: { ...env, ...patch } });
    assert.equal(res.status, 503);
  }
  assert.equal(calls.length, 0);
});

test("early access rejects invalid answers before calling any service", async () => {
  for (const patch of [
    { name: "" },
    { name: "x".repeat(101) },
    { email: "not-an-email" },
    { email: "a@b.co\r\nBcc: x@y.z" },
    { product: "" },
    { goal: "x".repeat(1801) },
    { noticeVersion: "2020-01-01" },
    { noticeVersion: undefined },
  ]) {
    const res = await post("/api/early-access", { ...signup, ...patch });
    assert.equal(res.status, 400, JSON.stringify(patch));
  }
  assert.equal(calls.length, 0);
});

test("a filled honeypot looks successful but does nothing", async () => {
  for (const path of ["/api/early-access", "/api/contact"]) {
    const res = await post(path, { ...signup, ...message, website: "https://spam.example" });
    assert.equal(res.status, 200);
  }
  assert.equal(calls.length, 0);
});

test("a failed Turnstile check stops the request", async () => {
  for (const result of [
    { success: false },
    { success: true, action: "contact", hostname: "claragtm.com" },
    { success: true, action: "early_access", hostname: "evil.example" },
  ]) {
    responders.push(reply(result));
    assert.equal((await post("/api/early-access", signup)).status, 403);
  }
  responders.push(() => { throw new Error("network down"); });
  assert.equal((await post("/api/early-access", signup)).status, 403);
  assert.equal(calls.length, 4);
});

test("a Turnstile test-key result passes only on an allowed hostname", async () => {
  const testResult = { success: true, hostname: "example.com", metadata: { result_with_testing_key: true } };
  responders.push(reply(testResult));
  assert.equal((await post("/api/contact", message)).status, 403);
  responders.push(reply(testResult), reply({ data: true }), reply({ data: true }));
  const local = { ...env, TURNSTILE_HOSTNAMES: "example.com" };
  assert.equal((await post("/api/contact", message, { config: local })).status, 200);
});

test("Turnstile is not called without a token or allowed hostnames", async () => {
  assert.equal((await post("/api/early-access", { ...signup, turnstileToken: "" })).status, 403);
  assert.equal((await post("/api/early-access", signup, { config: { ...env, TURNSTILE_HOSTNAMES: "" } })).status, 403);
  assert.equal(calls.length, 0);
});

test("a new signup is saved under Clara's own attributes and thanked", async () => {
  responders.push(turnstile("early_access"), reply({ data: { id: 1 } }), reply({ data: true }));
  const res = await post("/api/early-access?x=1", { ...signup, utm_source: "linkedin", utm_medium: "" });
  assert.equal(res.status, 200);

  const [verify, create, thanks] = calls;
  assert.equal(verify.url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(verify.init.body.get("secret"), "turnstile-secret");
  assert.equal(verify.init.body.get("remoteip"), "203.0.113.7");

  assert.equal(create.url, "https://mail.example/api/subscribers");
  assert.equal(create.init.headers.Authorization, "token clara-website:secret-token");
  assert.deepEqual(create.body.lists, [12]);
  assert.equal(create.body.preconfirm_subscriptions, true);
  const { clara } = create.body.attribs;
  assert.equal(clara.product, "Fieldnotes");
  assert.equal(clara.goal, "Release notes and LinkedIn posts.");
  assert.equal(clara.notice_version, NOTICE_VERSION);
  assert.equal(clara.utm_source, "linkedin");
  assert.equal("utm_medium" in clara, false);

  assert.equal(thanks.url, "https://mail.example/api/tx");
  assert.deepEqual(
    { email: thanks.body.subscriber_email, template: thanks.body.template_id, from: thanks.body.from_email },
    { email: "ada@example.com", template: 5, from: "Clara <hello@example.com>" },
  );
});

test("no thank-you email is sent until its template is configured", async () => {
  responders.push(turnstile("early_access"), reply({ data: { id: 1 } }));
  const res = await post("/api/early-access", signup, { config: { ...env, LISTMONK_WELCOME_TEMPLATE_ID: "0" } });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
});

test("a failed thank-you email doesn't fail the signup", async () => {
  responders.push(turnstile("early_access"), reply({ data: { id: 1 } }), reply({ message: "boom" }, 500));
  assert.equal((await post("/api/early-access", signup)).status, 200);
});

const existing = (lists, extra = {}) =>
  reply({
    data: {
      results: [{
        id: 44, email: "Ada@Example.com", name: "Ada", status: "enabled",
        attribs: { idea: "from Atomic" }, lists, ...extra,
      }],
    },
  });

test("an address from another list joins ours and keeps its other attributes", async () => {
  responders.push(
    turnstile("early_access"),
    reply({ message: "exists" }, 409),
    existing([{ id: 3, subscription_status: "confirmed" }, { id: 9, subscription_status: "unsubscribed" }]),
    reply({ data: {} }),
    reply({ data: true }),
  );
  assert.equal((await post("/api/early-access", signup)).status, 200);
  const update = calls[3];
  assert.equal(update.url, "https://mail.example/api/subscribers/44");
  assert.equal(update.init.method, "PUT");
  assert.deepEqual(update.body.lists, [3, 12]);
  assert.equal(update.body.attribs.idea, "from Atomic");
  assert.equal(update.body.attribs.clara.product, "Fieldnotes");
  assert.equal(calls[4].url, "https://mail.example/api/tx");
});

test("someone already on the list isn't emailed again", async () => {
  responders.push(
    turnstile("early_access"),
    reply({}, 409),
    existing([{ id: 12, subscription_status: "confirmed" }]),
    reply({ data: {} }),
  );
  assert.equal((await post("/api/early-access", signup)).status, 200);
  assert.equal(calls.length, 4);
});

test("an unsubscribed address is not resubscribed", async () => {
  responders.push(turnstile("early_access"), reply({}, 409), existing([{ id: 12, subscription_status: "unsubscribed" }]));
  const res = await post("/api/early-access", signup);
  assert.equal(res.status, 409);
  assert.equal(calls.length, 3);
});

test("a blocklisted address gets a quiet success and no email", async () => {
  responders.push(turnstile("early_access"), reply({}, 409), existing([], { status: "blocklisted" }));
  assert.equal((await post("/api/early-access", signup)).status, 200);
  assert.equal(calls.length, 3);
});

test("Listmonk failures are reported as 502", async () => {
  responders.push(turnstile("early_access"), reply({}, 500));
  assert.equal((await post("/api/early-access", signup)).status, 502);
  responders.push(turnstile("early_access"), reply({}, 409), reply({ data: { results: [] } }));
  assert.equal((await post("/api/early-access", signup)).status, 502);
});

// Contact

test("contact answers 503 until it is configured, as on PR previews", async () => {
  for (const patch of [{ LISTMONK_CONTACT_TEMPLATE_ID: "0" }, { LISTMONK_CONTACT_EMAIL: "" }, { TURNSTILE_SECRET: "" }]) {
    assert.equal((await post("/api/contact", message, { config: { ...env, ...patch } })).status, 503);
  }
  assert.equal(calls.length, 0);
});

test("contact rejects invalid answers before calling any service", async () => {
  for (const patch of [
    { name: "" },
    { email: "ada@example" },
    { email: "ada@example.com\nBcc: x@y.z" },
    { topic: "sales" },
    { topic: "__proto__" },
    { message: "" },
    { message: "x".repeat(5001) },
    { company: "x".repeat(181) },
    { noticeVersion: "old" },
  ]) {
    assert.equal((await post("/api/contact", { ...message, ...patch })).status, 400, JSON.stringify(patch));
  }
  assert.equal(calls.length, 0);
});

test("a contact message is emailed to the inbox with Reply-To and no subscriber is created", async () => {
  responders.push(turnstile("contact"), reply({ data: true }), reply({ data: true }));
  assert.equal((await post("/api/contact", message)).status, 200);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => !c.url.includes("/subscribers")));
  const tx = calls[1];
  assert.equal(tx.url, "https://mail.example/api/tx");
  assert.equal(tx.body.subscriber_mode, "external");
  assert.deepEqual(tx.body.subscriber_emails, ["inbox@example.com"]);
  assert.equal(tx.body.template_id, 6);
  assert.equal(tx.body.from_email, "Clara <hello@example.com>");
  assert.deepEqual(tx.body.headers, [{ "Reply-To": "ada@example.com" }]);
  assert.equal(tx.body.data.topic, "Partnerships");
  assert.equal(tx.body.data.message, "Could we talk about a partnership?");
  assert.equal(tx.body.data.company, "Fieldnotes");
});

test("the visitor gets a receipt that carries none of their own text", async () => {
  responders.push(turnstile("contact"), reply({ data: true }), reply({ data: true }));
  await post("/api/contact", { ...message, name: "Visit spam.example", message: "Buy now" });
  const receipt = calls[2];
  assert.equal(receipt.url, "https://mail.example/api/tx");
  assert.equal(receipt.body.subscriber_mode, "external");
  assert.deepEqual(receipt.body.subscriber_emails, ["ada@example.com"]);
  assert.equal(receipt.body.template_id, 7);
  assert.deepEqual(receipt.body.data, { topic: "Partnerships" });
  assert.deepEqual(receipt.body.headers, [{ "Reply-To": "inbox@example.com" }]);
});

test("no receipt is sent until its template is configured", async () => {
  responders.push(turnstile("contact"), reply({ data: true }));
  const res = await post("/api/contact", message, { config: { ...env, LISTMONK_CONTACT_RECEIPT_TEMPLATE_ID: "0" } });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
});

test("a failed receipt doesn't fail the message", async () => {
  responders.push(turnstile("contact"), reply({ data: true }), reply({}, 500));
  assert.equal((await post("/api/contact", message)).status, 200);
});

test("a contact token issued for the signup form is rejected", async () => {
  responders.push(turnstile("early_access"));
  assert.equal((await post("/api/contact", message)).status, 403);
});

test("a failed contact email is reported so the visitor can retry", async () => {
  responders.push(turnstile("contact"), reply({}, 500));
  assert.equal((await post("/api/contact", message)).status, 502);
  assert.equal(calls.length, 2);
});
