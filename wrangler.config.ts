import { defineWranglerConfig } from "wrangler/experimental-config";

// Build settings for the Worker in cloudflare.config.ts. cf hands the build to
// Wrangler, which bundles worker/index.js and uploads site/dist as its assets.
export default defineWranglerConfig({
  assetsDirectory: "./site/dist",
});
