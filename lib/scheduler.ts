import { syncAllJobs } from "@/lib/jobs";

let started = false;

export function startDailySync() {
  if (started) return;
  started = true;

  async function loop() {
    while (true) {
      try {
        console.log("[scheduler] Starting job sync...");
        const results = await syncAllJobs();
        const fetched = results.reduce((s, r) => s + r.jobsFetched, 0);
        const upserted = results.reduce((s, r) => s + r.jobsUpserted, 0);
        const failed = results.filter((r) => !r.ok).length;
        console.log(`[scheduler] Sync complete — ${results.length} sources, ${fetched} fetched, ${upserted} upserted${failed ? `, ${failed} failed` : ""}. Restarting immediately.`);
      } catch (err) {
        console.error("[scheduler] Sync failed:", err);
      }
      // 60s pause between runs to avoid hammering sources on repeated failures
      await new Promise((res) => setTimeout(res, 60_000));
    }
  }

  // Short initial delay so the server finishes starting up before the first sync
  setTimeout(loop, 2 * 60 * 1000);

  console.log("[scheduler] Continuous job sync started.");
}
