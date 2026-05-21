import { NextRequest, NextResponse } from "next/server";
import { listCompanies } from "@/lib/companies";
import { rateLimitWithRetry, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = rateLimitWithRetry(`companies:${ip}`, 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const data = await listCompanies({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    remotePolicy: searchParams.get("remotePolicy") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    size: searchParams.get("size") ?? undefined,
    skill: searchParams.get("skill") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    ats: searchParams.get("ats") ?? undefined,
    activeHiring: searchParams.get("activeHiring") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
    limit: Math.min(Number(searchParams.get("limit") ?? "24"), 100),
  });

  return NextResponse.json(data);
}
