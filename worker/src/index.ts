import { chromium, type Browser } from "playwright";
import { submitApplication } from "./submit.js";
import type { Claim, SubmitResult } from "./types.js";

const API = process.env.HYRD_API_URL?.replace(/\/$/, "");
const SECRET = process.env.AUTO_APPLY_WORKER_SECRET;
// Fill forms but never click Submit — for testing a deployment end to end.
const DRY_RUN = process.env.DRY_RUN === "true";
const POLL_MS = 15_000;
// Relaunch Chromium periodically so a long-running worker doesn't creep in memory.
const JOBS_PER_BROWSER = 20;

if (!API || !SECRET) {
  console.error("HYRD_API_URL and AUTO_APPLY_WORKER_SECRET must be set.");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let browser: Browser | null = null;
let jobsOnBrowser = 0;

async function getBrowser() {
  if (!browser || !browser.isConnected() || jobsOnBrowser >= JOBS_PER_BROWSER) {
    await browser?.close().catch(() => undefined);
    browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });
    jobsOnBrowser = 0;
  }
  return browser;
}

async function claim(): Promise<Claim | null> {
  const res = await fetch(`${API}/api/internal/auto-apply/claim`, { method: "POST", headers });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`claim failed: ${res.status} ${await res.text().catch(() => "")}`);
  return (await res.json()) as Claim;
}

async function report(id: string, result: SubmitResult) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${API}/api/internal/auto-apply/${id}/result`, {
        method: "POST",
        headers,
        body: JSON.stringify(result),
      });
      if (res.ok || res.status === 409) return;
      console.error(`[worker] report ${id} → ${res.status}`);
    } catch (err) {
      console.error(`[worker] report ${id} failed:`, err instanceof Error ? err.message : err);
    }
    await sleep(attempt * 5000);
  }
}

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});

console.log(`[worker] polling ${API} every ${POLL_MS / 1000}s${DRY_RUN ? " (DRY RUN — nothing is submitted)" : ""}`);

while (!stopping) {
  try {
    const job = await claim();
    if (!job) {
      await sleep(POLL_MS);
      continue;
    }
    console.log(`[worker] ${job.id} — ${job.ats} ${job.formUrl}`);
    const result = await submitApplication(await getBrowser(), job, { dryRun: DRY_RUN });
    jobsOnBrowser++;
    console.log(`[worker] ${job.id} → ${result.status}${result.error ? ` (${result.error})` : ""}`);
    await report(job.id, result);
  } catch (err) {
    console.error("[worker] loop error:", err instanceof Error ? err.message : err);
    await sleep(30_000);
  }
}

await (browser as Browser | null)?.close().catch(() => undefined);
