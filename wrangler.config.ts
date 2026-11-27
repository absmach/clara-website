import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineWranglerConfig } from "wrangler/experimental-config";

// Build settings for the Worker in cloudflare.config.ts. cf hands the build to
// Wrangler, which runs build.command (the site build into site/dist), bundles
// worker/index.js and uploads site/dist as its assets. site/dist is generated
// and not committed, so the build runs on every deploy, previews included.
//
// Wrangler checks that the assets directory exists before it runs the build
// command, so create it empty on a fresh clone; the build then fills it.
mkdirSync(fileURLToPath(new URL("./site/dist", import.meta.url)), { recursive: true });

export default defineWranglerConfig({
  build: {
    command: "npm run build",
    watchDir: ["site/src", "site/docs", "site/scripts", "worker/forms.js"],
  },
  assetsDirectory: "./site/dist",
});
