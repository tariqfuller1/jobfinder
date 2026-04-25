import { syncAllJobs } from "@/lib/jobs";

let started = false;

export function startDailySync() {
  if (started) return;
  started = true;

  async function runSync() {
    try {
      console.log("[scheduler] Starting daily job sync...");
      const results = await syncAllJobs();
      const fetched = results.reduce((s, r) => s + r.jobsFetched, 0);
      const upserted = results.reduce((s, r) => s + r.jobsUpserted, 0);
      const failed = results.filter((r) => !r.ok).length;
      console.log(`[scheduler] Sync complete — ${results.length} sources, ${fetched} fetched, ${upserted} upserted${failed ? `, ${failed} failed` : ""}.`);
    } catch (err) {
      console.error("[scheduler] Sync failed:", err);
    }
  }

  setTimeout(runSync, 2 * 60 * 1000);
  setInterval(runSync, 24 * 60 * 60 * 1000);

  console.log("[scheduler] Daily job sync scheduled.");
}
