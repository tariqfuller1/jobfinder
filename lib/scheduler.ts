import { syncAllJobs } from "@/lib/jobs";

let started = false;

export function startContinuousSync() {
  if (started) return;
  started = true;

  (async () => {
    // Wait for Next.js to finish starting up before the first sync
    await new Promise((res) => setTimeout(res, 2 * 60 * 1000));

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
  })();

  console.log("[scheduler] Continuous job sync started.");
}
