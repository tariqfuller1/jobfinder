import crypto from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Guards the internal endpoints the submit worker calls. Returns a response to
 * send back when the request isn't authorized, or null when it is.
 */
export function checkWorkerAuth(request: Request): NextResponse | null {
  const secret = process.env.AUTO_APPLY_WORKER_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Auto-apply worker is not configured." }, { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = crypto.createHash("sha256").update(token).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  if (!crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return null;
}
