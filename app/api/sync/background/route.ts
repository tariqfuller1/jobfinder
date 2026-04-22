import { getCurrentUser } from "@/lib/auth";
import { syncAllJobs } from "@/lib/jobs";
import { discoverSourcesForAllCompanies } from "@/lib/source-discovery";

export const dynamic = "force-dynamic";

// In-memory state — persists across requests in Railway's persistent Node.js server
let syncRunning = false;
let syncStats = { fetched: 0, upserted: 0, sources: 0, totalSources: 0, done: false, error: "" };

export async function GET() {
  return Response.json({ running: syncRunning, ...syncStats });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const user = await getCurrentUser();

  if (!user && secret !== process.env.SYNC_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (syncRunning) {
    return Response.json({ message: "Already running", running: true, ...syncStats });
  }

  syncRunning = true;
  syncStats = { fetched: 0, upserted: 0, sources: 0, totalSources: 0, done: false, error: "" };

  // Fire-and-forget — Railway's persistent Node.js server keeps this running
  // after the HTTP response is returned, no timeout applies.
  (async () => {
    try {
      await discoverSourcesForAllCompanies();
      await syncAllJobs(
        (result, completed, total, rf, ru) => {
          syncStats.fetched = rf;
          syncStats.upserted = ru;
          syncStats.sources = completed;
          syncStats.totalSources = total;
        },
      );
      syncStats.done = true;
    } catch (err) {
      syncStats.error = err instanceof Error ? err.message : "Unknown error";
    } finally {
      syncRunning = false;
    }
  })();

  return Response.json({ message: "Full sync started in background", running: true });
}
