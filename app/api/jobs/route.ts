import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listJobs } from "@/lib/jobs";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth";

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

const createSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  applyUrl: z.string().min(1),
  location: z.string().optional().default(""),
  workplaceType: z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]).default("UNKNOWN"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY", "UNKNOWN"]).default("UNKNOWN"),
  experienceLevel: z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "INTERN", "UNKNOWN"]).default("UNKNOWN"),
  descriptionText: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to add a job." }, { status: 401 });
  }

  const body = createSchema.parse(await request.json());
  const externalId = `manual-${user.id}-${Date.now()}`;

  const job = await prisma.job.create({
    data: {
      source: "manual",
      externalId,
      sourceUrl: body.applyUrl,
      applyUrl: body.applyUrl,
      title: body.title,
      company: body.company,
      location: body.location || null,
      workplaceType: body.workplaceType,
      employmentType: body.employmentType,
      experienceLevel: body.experienceLevel,
      descriptionText: body.descriptionText || null,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
