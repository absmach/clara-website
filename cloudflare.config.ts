import { bindings, defineConfig, defineWorker } from "cf/config";

// IDs from Listmonk (mailer.absmach.eu). "0" turns that part off: no list makes
// /api/early-access answer 503, no thank-you template saves signups without an
// email, no contact template makes /api/contact answer 503, and no receipt
// template sends contact messages without a confirmation to the visitor.
const LISTMONK_IDS = {
  list: "11", // "Clara early access" list
  welcomeTemplate: "9", // transactional template: early-access thank-you
  contactTemplate: "10", // transactional template: contact notification to the inbox
  contactReceiptTemplate: "11", // transactional template: "we got your message" to the visitor
};
// PR previews never write to the production list or email the team inbox.
const OFF = { list: "0", welcomeTemplate: "0", contactTemplate: "0", contactReceiptTemplate: "0" };

// Static site plus a small Worker for the forms. Cloudflare serves site/dist
// from its edge (the directory is set in wrangler.config.ts) and runs
// worker/index.js only for /api/*.
export default defineConfig(({ isPreview, mode }) => {
  const preview = isPreview || mode === "preview";
  const ids = preview ? OFF : LISTMONK_IDS;
  return {
    accountId: "058225ae7b31fdf8131858ff8b8fd924",
    worker: defineWorker({
      name: "clara-website",
      compatibilityDate: "2026-11-12",
      entrypoint: "./worker/index.js",
      domains: preview ? [] : ["claragtm.com", "www.claragtm.com"],
      // www is attached too; a zone Redirect Rule 301s it to the apex before the Worker runs.
      workersDev: false,
      previewUrls: true,
      observability: { enabled: true },
      assets: {
        // /docs/ -> docs/index.html, and /docs redirects to /docs/
        htmlHandling: "auto-trailing-slash",
        // Serve dist/404.html with a 404 status for unknown paths
        notFoundHandling: "404-page",
        runWorkerFirst: ["/api/*"],
      },
      env: {
        LISTMONK_URL: bindings.text("https://mailer.absmach.eu"),
        LISTMONK_API_USER: bindings.text("clara-website"),
        LISTMONK_LIST_ID: bindings.text(ids.list),
        LISTMONK_WELCOME_TEMPLATE_ID: bindings.text(ids.welcomeTemplate),
        LISTMONK_CONTACT_TEMPLATE_ID: bindings.text(ids.contactTemplate),
        LISTMONK_CONTACT_RECEIPT_TEMPLATE_ID: bindings.text(ids.contactReceiptTemplate),
        LISTMONK_CONTACT_EMAIL: bindings.text("info@absmach.eu"),
        // Switch to a claragtm.com address once its SPF, DKIM and DMARC are set up.
        LISTMONK_FROM_EMAIL: bindings.text("Clara <noreply@absmach.eu>"),
        // Hostnames a Turnstile token must have been issued on.
        TURNSTILE_HOSTNAMES: bindings.text(preview ? "" : "claragtm.com,www.claragtm.com"),
        // Secrets LISTMONK_API_TOKEN and TURNSTILE_SECRET are set on the Worker
        // in the dashboard (Settings → Runtime variables and secrets) and in
        // .dev.vars for local runs. They aren't declared here yet: a declared
        // secret makes `cf deploy` refuse to run until it exists, and the
        // dashboard only accepts runtime secrets once the Worker has code.
        // Declare them with bindings.secret() once they are set.
      },
    }),
  };
});
