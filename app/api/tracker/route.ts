import { NextResponse } from "next/server";
import { z } from "zod";
import { createApplication, listApplications } from "@/lib/tracker";
import { getCurrentUserFromRequest } from "@/lib/auth";

const createSchema = z.object({
  jobId: z.string().min(1),
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

  const body = createSchema.parse(await request.json());
  const application = await createApplication(user.id, body.jobId);
  return NextResponse.json(application, { status: 201 });
}
