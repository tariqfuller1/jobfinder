import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** The worker's screenshot of the form after submitting — the user's proof of what was sent. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const row = await prisma.autoApply.findFirst({ where: { id, userId: user.id }, select: { screenshot: true } });
  if (!row?.screenshot) return NextResponse.json({ error: "No screenshot." }, { status: 404 });

  return new NextResponse(Buffer.from(row.screenshot), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
