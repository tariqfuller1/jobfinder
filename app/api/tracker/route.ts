import { NextResponse } from "next/server";
import { z } from "zod";
import { createApplication, createManualApplication, listApplications } from "@/lib/tracker";
import { getCurrentUserFromRequest } from "@/lib/auth";

const jobIdSchema = z.object({ jobId: z.string().min(1) });

const manualSchema = z.object({
  company: z.string().min(1),
  roleTitle: z.string().min(1),
  applyUrl: z.string().default(""),
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
