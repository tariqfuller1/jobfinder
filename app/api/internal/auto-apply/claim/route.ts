import { NextResponse } from "next/server";
import { checkWorkerAuth } from "@/lib/auto-apply/worker-auth";
import { claimNextAutoApply } from "@/lib/auto-apply/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The submit worker polls this for the next approved application. 204 = nothing queued. */
export async function POST(request: Request) {
  const denied = checkWorkerAuth(request);
  if (denied) return denied;

  const next = await claimNextAutoApply();
  if (!next) return new NextResponse(null, { status: 204 });
  return NextResponse.json(next);
}
