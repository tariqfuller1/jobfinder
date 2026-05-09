import { NextResponse } from "next/server";
import { getJobById, updateJob } from "@/lib/jobs";
import { getCurrentUserFromRequest } from "@/lib/auth";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const allowed = ["workplaceType", "employmentType", "experienceLevel", "location"];
  const data: Record<string, string> = {};
  if (typeof body === "object" && body !== null) {
    for (const key of allowed) {
      if (typeof (body as Record<string, unknown>)[key] === "string") {
        data[key] = (body as Record<string, string>)[key];
      }
    }
  }

  const job = await updateJob(id, data);
  return NextResponse.json(job);
}
