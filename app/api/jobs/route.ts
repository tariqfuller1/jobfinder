import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listJobs } from "@/lib/jobs";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { rateLimitWithRetry } from "@/lib/rate-limit";

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
    sort: (searchParams.get("sort") as "recent" | "oldest" | "fit" | "salary") || undefined,
    source: searchParams.get("source") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    recommendedOnly: searchParams.get("recommendedOnly") === "true",
    page: Number(searchParams.get("page") ?? "1"),
    limit: Math.min(Number(searchParams.get("limit") ?? "20"), 100),
    since: searchParams.get("since") ?? undefined,
  });

  return NextResponse.json(data);
}

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

const createSchema = z.object({
  title: z.string().min(1).max(300),
  company: z.string().min(1).max(200),
  applyUrl: z.string().min(1).refine(isHttpUrl, "URL must start with http:// or https://"),
  location: z.string().max(300).optional().default(""),
  workplaceType: z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]).default("UNKNOWN"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY", "UNKNOWN"]).default("UNKNOWN"),
  experienceLevel: z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "INTERN", "UNKNOWN"]).default("UNKNOWN"),
  descriptionText: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = rateLimitWithRetry(`jobs-create:${ip}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to add a job." }, { status: 401 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

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
      tags: "[]",
    },
  });

  return NextResponse.json(job, { status: 201 });
}
