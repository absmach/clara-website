import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineWranglerConfig } from "wrangler/experimental-config";

// Build settings for the Worker in cloudflare.config.ts. cf hands the build to
// Wrangler, which runs build.command (build the site into site/dist, then check
// it), bundles worker/index.js and uploads site/dist as its assets. site/dist is
// generated and not committed, so the build runs on every deploy, previews
// included, and a failing check blocks the deploy.
//
// Wrangler checks that the assets directory exists before it runs the build
// command, so create it empty on a fresh clone; the build then fills it.
mkdirSync(fileURLToPath(new URL("./site/dist", import.meta.url)), { recursive: true });

// Only `cf dev` builds without the checks. Wrangler sets no mode for it (mode is
// undefined there and for preview builds), so match the subcommand, which is the
// first argument after the script: [.., "dev"] under `cf dev`, [.., "build", ..]
// otherwise. No flag value can match, and anything unexpected runs the checks.
const isDev = process.argv[2] === "dev";

export default defineWranglerConfig({
  build: {
    command: isDev ? "pnpm run build" : "pnpm run build && pnpm run check",
    watchDir: ["site/src", "site/docs", "site/scripts", "worker/forms.js"],
  },
  assetsDirectory: "./site/dist",
});
