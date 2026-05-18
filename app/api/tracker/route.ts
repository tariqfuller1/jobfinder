import { NextResponse } from "next/server";
import { z } from "zod";
import { createApplication, createManualApplication, listApplications } from "@/lib/tracker";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { rateLimitWithRetry } from "@/lib/rate-limit";

const jobIdSchema = z.object({ jobId: z.string().min(1) });

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

const manualSchema = z.object({
  company: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(300),
  applyUrl: z.string().refine(v => !v || isHttpUrl(v), "URL must start with http:// or https://").default(""),
  status: z.string().default("SAVED"),
});

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to view your tracker." }, { status: 401 });
  }

  const rows = await listApplications(user.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = rateLimitWithRetry(`tracker-create:${ip}`, 60, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to track applications." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    if (typeof body === "object" && body !== null && "jobId" in body) {
      const { jobId } = jobIdSchema.parse(body);
      const application = await createApplication(user.id, jobId);
      return NextResponse.json(application, { status: 201 });
    }
    const data = manualSchema.parse(body);
    const application = await createManualApplication(user.id, data);
    return NextResponse.json(application, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
