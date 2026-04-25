import { syncAllJobs } from "@/lib/jobs";

let started = false;

export function startDailySync() {
  if (started) return;
  started = true;

  async function runSync() {
    try {
      console.log("[scheduler] Starting daily job sync...");
      const results = await syncAllJobs();
      const upserted = results.reduce((s, r) => s + r.jobsUpserted, 0);
      console.log(`[scheduler] Sync complete — ${upserted} jobs updated/added.`);
    } catch (err) {
      console.error("[scheduler] Sync failed:", err);
    }
  }

  // Run once 2 minutes after startup (give the server time to settle)
  setTimeout(runSync, 2 * 60 * 1000);

  // Then once every 24 hours
  setInterval(runSync, 24 * 60 * 60 * 1000);

  console.log("[scheduler] Daily job sync scheduled.");
}
