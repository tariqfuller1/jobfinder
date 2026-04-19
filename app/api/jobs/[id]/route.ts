import { NextResponse } from "next/server";
import { getJobById, updateJob } from "@/lib/jobs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["workplaceType", "employmentType", "experienceLevel", "location"];
  const data: Record<string, string> = {};
  for (const key of allowed) {
    if (typeof body[key] === "string") data[key] = body[key];
  }
  const job = await updateJob(id, data);
  return NextResponse.json(job);
}
