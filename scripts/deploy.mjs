// Publishes site/dist to Cloudflare Workers with the project's pinned cf CLI.
//   node scripts/deploy.mjs production   -> claragtm.com
//   node scripts/deploy.mjs preview      -> pr-<PULL_REQUEST_NUMBER> Preview URL
//   node scripts/deploy.mjs cleanup      -> deletes that PR's Preview
// Build and check the site before running production or preview.
import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const WORKER = "clara-website";
const SITE_URL = "https://claragtm.com";
const ASSETS_DIR = "./site/dist";

const kind = process.argv[2];
if (!["production", "preview", "cleanup"].includes(kind)) {
  throw new Error("Use production, preview or cleanup.");
}
const number = process.env.PULL_REQUEST_NUMBER;
if (kind !== "production" && !/^\d+$/.test(number || "")) {
  throw new Error("A numeric PULL_REQUEST_NUMBER is required.");
}
const previewName = `pr-${number}`;
const args = kind === "production"
  ? ["deploy", ASSETS_DIR, "--mode", "production"]
  : kind === "preview"
    ? ["previews", "deploy", ASSETS_DIR, "--mode", "preview", "--preview-name", previewName]
    : ["previews", "delete", previewName, "--worker", WORKER, "--mode", "preview", "--force"];

let output = "";
const cli = fileURLToPath(new URL("../node_modules/cf/bin/cf", import.meta.url));
const child = spawn(process.execPath, [cli, ...args], {
  env: { ...process.env, CF_SEND_TELEMETRY: "false" },
  stdio: ["ignore", "pipe", "pipe"],
});
for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
  stream.on("data", (chunk) => { output += chunk; destination.write(chunk); });
}
child.on("error", (error) => { throw error; });
const code = await new Promise((resolve) => child.on("close", resolve));
if (code !== 0) {
  // A PR closed before its preview was ever published has nothing to clean up.
  if (kind === "cleanup" && /404 Not Found/i.test(output)) process.exit(0);
  process.exit(typeof code === "number" ? code : 1);
}
if (kind === "cleanup") process.exit(0);

const plain = output.replace(/\u001b\[[0-9;]*m/g, "");
const urls = plain.match(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev\b/g);
const url = kind === "production" ? SITE_URL : urls?.[0];
if (!url) throw new Error("Cloudflare did not return a Preview URL. Inspect the deployment log.");
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `url=${url}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${kind === "production" ? "Production" : `PR #${number} preview`}: [${url}](${url})\n`);
}
console.log(`Deployment URL: ${url}`);
