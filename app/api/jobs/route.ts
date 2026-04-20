import { NextRequest, NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const data = await listJobs({
    q: searchParams.get("q") ?? undefined,
    workplaceType: searchParams.get("workplaceType") ?? undefined,
    employmentType: searchParams.get("employmentType") ?? undefined,
    experienceLevel: searchParams.get("experienceLevel") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    states: searchParams.get("states") ? searchParams.get("states")!.split(",").filter(Boolean) : undefined,
    country: searchParams.get("country") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    recommendedOnly: searchParams.get("recommendedOnly") === "true",
    page: Number(searchParams.get("page") ?? "1"),
    limit: Number(searchParams.get("limit") ?? "20"),
    since: searchParams.get("since") ?? undefined,
  });

  return NextResponse.json(data);
}
