import { NextResponse } from "next/server";
import { getJobById, updateJob } from "@/lib/jobs";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitWithRetry } from "@/lib/rate-limit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in to edit jobs." }, { status: 401 });

  const { id } = await params;

  // Check job ownership before accepting edits
  const jobMeta = await prisma.job.findUnique({ where: { id }, select: { source: true, externalId: true } });
  if (!jobMeta) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  if (jobMeta.source === "manual") {
    // Manual jobs are owned by the user whose ID is embedded in the externalId
    if (!jobMeta.externalId.startsWith(`manual-${user.id}-`)) {
      return NextResponse.json({ error: "You can only edit jobs you added manually." }, { status: 403 });
    }
  } else {
    // External jobs: allow authenticated classification corrections but rate-limit to prevent bulk abuse
    const rl = rateLimitWithRetry(`job-classify:${user.id}`, 30, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many job corrections. Try again later." }, { status: 429 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const VALID_VALUES: Record<string, Set<string>> = {
    workplaceType: new Set(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]),
    employmentType: new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY", "UNKNOWN"]),
    experienceLevel: new Set(["ENTRY", "MID", "SENIOR", "LEAD", "INTERN", "UNKNOWN"]),
  };

  const data: Record<string, string> = {};
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    for (const key of ["workplaceType", "employmentType", "experienceLevel"]) {
      if (typeof b[key] === "string" && VALID_VALUES[key].has(b[key] as string)) {
        data[key] = b[key] as string;
      }
    }
    if (typeof b.location === "string") {
      data.location = b.location.trim().slice(0, 200);
    }
  }

  try {
    const job = await updateJob(id, data);
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Could not update job." }, { status: 400 });
  }
}
