import { NextRequest, NextResponse } from "next/server";
import { listCompanies } from "@/lib/companies";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = await listCompanies({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    remotePolicy: searchParams.get("remotePolicy") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    size: searchParams.get("size") ?? undefined,
    skill: searchParams.get("skill") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    ats: searchParams.get("ats") ?? undefined,
    activeHiring: searchParams.get("activeHiring") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
    limit: Number(searchParams.get("limit") ?? "24"),
  });

  return NextResponse.json(data);
}
