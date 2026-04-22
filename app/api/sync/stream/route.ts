import { getCurrentUser } from "@/lib/auth";
import { syncAllJobs } from "@/lib/jobs";
import { discoverSourcesForAllCompanies } from "@/lib/source-discovery";

// Never cache this route
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — maximum Railway allows on hobby plan

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const user = await getCurrentUser();

  if (!user && secret !== process.env.SYNC_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // client already disconnected — ignore
        }
      }

      try {
        // Step 1: discover ATS sources from company career pages
        send({ type: "status", message: "Scanning company career pages for ATS sources…" });
        const discovery = await discoverSourcesForAllCompanies();
        const discovered = discovery.filter((r) => r.discovered).length;
        send({
          type: "status",
          message: `Found ${discovered} new ATS source${discovered !== 1 ? "s" : ""}. Starting job sync…`,
        });

        // Step 2: sync all sources, streaming progress before and after each source
        const results = await syncAllJobs(
          (result, completed, total, runningFetched, runningUpserted) => {
            send({
              type: "source",
              ...result,
              completed,
              total,
              runningFetched,
              runningUpserted,
            });
          },
          (source, index, total) => {
            send({ type: "start", source, index, total });
          },
        );

        const totalFetched = results.reduce((s, r) => s + r.jobsFetched, 0);
        const totalUpserted = results.reduce((s, r) => s + r.jobsUpserted, 0);
        const failed = results.filter((r) => !r.ok).length;

        send({ type: "done", totalFetched, totalUpserted, totalSources: results.length, failed });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
