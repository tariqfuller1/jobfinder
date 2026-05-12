import { NextResponse } from "next/server";
import { clearSessionCookie, destroySessionByToken } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("jobfinder_session="))
    ?.slice("jobfinder_session=".length);

  let decoded: string | null = null;
  try { decoded = token ? decodeURIComponent(token) : null; } catch { /* malformed cookie — ignore */ }
  await destroySessionByToken(decoded);
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
