import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineWranglerConfig } from "wrangler/experimental-config";

// Build settings for the Worker in cloudflare.config.ts. cf hands the build to
// Wrangler, which runs build.command (build the site into site/dist, then check it), bundles
// worker/index.js and uploads site/dist as its assets. site/dist is generated
// and not committed, so the build runs on every deploy, previews included.
//
// Wrangler checks that the assets directory exists before it runs the build
// command, so create it empty on a fresh clone; the build then fills it.
mkdirSync(fileURLToPath(new URL("./site/dist", import.meta.url)), { recursive: true });

// Every deploy (production and previews) builds the site and runs the checks,
// so a failing check blocks the deploy. Local `pnpm run dev:worker` sets
// CLARA_SKIP_CHECK=1 to build only.
const skipCheck = process.env.CLARA_SKIP_CHECK === "1";

export default defineWranglerConfig({
  build: {
    command: skipCheck ? "pnpm run build" : "pnpm run build && pnpm run check",
    watchDir: ["site/src", "site/docs", "site/scripts", "worker/forms.js"],
  },
  assetsDirectory: "./site/dist",
});
