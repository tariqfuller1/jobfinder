// Fills a live application form from a claim JSON file and saves a screenshot —
// never clicks Submit. For checking selectors after an ATS changes its form.
//
//   npm run dry-run -- claim.json [resume.pdf] [--headed]

import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { chromium } from "playwright";
import { submitApplication } from "./submit.js";
import type { Claim } from "./types.js";

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const [claimPath, resumePath] = args.filter((a) => !a.startsWith("--"));
if (!claimPath) {
  console.error("Usage: npm run dry-run -- claim.json [resume.pdf] [--headed]");
  process.exit(1);
}

const claim = JSON.parse(readFileSync(claimPath, "utf8")) as Claim;
if (resumePath) {
  claim.resume = {
    fileName: basename(resumePath),
    mimeType: resumePath.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
    base64: readFileSync(resumePath).toString("base64"),
  };
}

const browser = await chromium.launch({ headless: !headed });
const result = await submitApplication(browser, claim, { dryRun: true });
await browser.close();

console.log(result.error);
if (result.screenshotBase64) {
  const out = claimPath.replace(/\.json$/, "") + ".png";
  writeFileSync(out, Buffer.from(result.screenshotBase64, "base64"));
  console.log(`Screenshot: ${out}`);
}
