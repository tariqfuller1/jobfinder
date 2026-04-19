import { NextResponse } from "next/server";
import { syncAllJobs } from "@/lib/jobs";
import { discoverSourcesForAllCompanies } from "@/lib/source-discovery";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.SYNC_SECRET}`;

  if (!process.env.SYNC_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discovery = await discoverSourcesForAllCompanies();
  const results = await syncAllJobs();
  return NextResponse.json({ ok: true, discovery, results });
}
