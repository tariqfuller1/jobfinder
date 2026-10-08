import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { rateLimitWithRetry } from "@/lib/rate-limit";
import { saveResumeFile } from "@/lib/auto-apply/service";

export const runtime = "nodejs";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
// Application forms accept PDF and Word; plain text isn't a real resume upload.
const ALLOWED: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in to upload a resume." }, { status: 401 });

  const rl = rateLimitWithRetry(`auto-apply:resume:${user.id}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("resumeFile");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a PDF or DOCX resume to upload." }, { status: 400 });
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 413 });
  }
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED[ext]) {
    return NextResponse.json({ error: "Only PDF and DOCX resumes can be attached to applications." }, { status: 415 });
  }

  await saveResumeFile(user.id, {
    data: Buffer.from(await file.arrayBuffer()),
    fileName: file.name.slice(0, 200),
    type: ALLOWED[ext],
  });
  return NextResponse.json({ ok: true, fileName: file.name });
}
