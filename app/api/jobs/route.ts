import { NextRequest, NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parseList = (key: string) => {
    const v = searchParams.get(key);
    return v ? v.split(",").filter(Boolean) : undefined;
  };

  const data = await listJobs({
    q: searchParams.get("q") ?? undefined,
    workplaceTypes: parseList("workplaceTypes"),
    employmentTypes: parseList("employmentTypes"),
    experienceLevels: parseList("experienceLevels"),
    departments: parseList("departments"),
    location: searchParams.get("location") ?? undefined,
    states: parseList("states"),
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
