import { syncAllJobs } from "@/lib/jobs";

let started = false;

export function startDailySync() {
  if (started) return;
  started = true;

  async function loop() {
    while (true) {
      try {
        console.log("[scheduler] Starting job sync...");
        const { results, pruned } = await syncAllJobs();
        const fetched = results.reduce((s, r) => s + r.jobsFetched, 0);
        const upserted = results.reduce((s, r) => s + r.jobsUpserted, 0);
        const failed = results.filter((r) => !r.ok).length;
        console.log(
          `[scheduler] Sync complete — ${results.length} sources, ${fetched} fetched, ${upserted} upserted` +
          (failed ? `, ${failed} failed` : "") +
          `, ${pruned.deactivated} deactivated, ${pruned.deleted} deleted.`
        );
      } catch (err) {
        console.error("[scheduler] Sync failed:", err);
      }
      // 3 min pause between runs — gives Node idle time for GC to collect
      // job objects from the completed sync before the next one allocates
      await new Promise((res) => setTimeout(res, 3 * 60_000));
    }
  }

  // Short initial delay so the server finishes starting up before the first sync
  setTimeout(loop, 2 * 60 * 1000);

  console.log("[scheduler] Continuous job sync started.");
}
