import { NextResponse } from "next/server";
import { z } from "zod";
import { checkWorkerAuth } from "@/lib/auto-apply/worker-auth";
import { recordAutoApplyResult } from "@/lib/auto-apply/service";

export const runtime = "nodejs";

const resultSchema = z.object({
  status: z.enum(["SUBMITTED", "NEEDS_MANUAL", "FAILED"]),
  error: z.string().max(2000).optional(),
  screenshotBase64: z.string().max(8_000_000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkWorkerAuth(request);
  if (denied) return denied;

  const parsed = resultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid result body." }, { status: 400 });

  const { id } = await params;
  const result = await recordAutoApplyResult(id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
