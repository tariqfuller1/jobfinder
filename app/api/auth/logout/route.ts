import { NextResponse } from "next/server";
import { clearSessionCookie, destroySessionByToken } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("jobfinder_session="))
    ?.slice("jobfinder_session=".length);

  await destroySessionByToken(token ? decodeURIComponent(token) : null);
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
