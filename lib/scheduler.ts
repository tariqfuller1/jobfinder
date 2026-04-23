import { syncAllJobs } from "@/lib/jobs";

let started = false;

export function startHourlySync() {
  if (started) return;
  started = true;

  async function runSync() {
    try {
      console.log("[scheduler] Starting hourly job sync...");
      const results = await syncAllJobs();
      const upserted = results.reduce((s, r) => s + r.jobsUpserted, 0);
      console.log(`[scheduler] Sync complete — ${upserted} new jobs added.`);
    } catch (err) {
      console.error("[scheduler] Sync failed:", err);
    }
  }

  // Run once 2 minutes after startup (give the server time to settle)
  setTimeout(runSync, 2 * 60 * 1000);

  // Then every hour
  setInterval(runSync, 60 * 60 * 1000);

  console.log("[scheduler] Hourly job sync scheduled.");
}
