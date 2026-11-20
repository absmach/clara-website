import { defineConfig, defineWorker } from "cf/config";

// Assets-only Worker: `cf deploy ./site/dist` uploads the prebuilt static site.
// No server code runs; Cloudflare serves files from its edge.
export default defineConfig(({ isPreview, mode }) => {
  const preview = isPreview || mode === "preview";
  return {
    accountId: "058225ae7b31fdf8131858ff8b8fd924",
    worker: defineWorker({
      name: "clara-website",
      compatibilityDate: "2026-11-12",
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
      },
    }),
  };
});
