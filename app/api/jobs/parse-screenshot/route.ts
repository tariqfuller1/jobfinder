import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { rateLimitWithRetry } from "@/lib/rate-limit";
import { parseJobScreenshotWithAI } from "@/lib/parse-job-screenshot-ai";

export const runtime = "nodejs";

// Groq's vision endpoint caps base64 image requests at 4 MB.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to use screenshot autofill." }, { status: 401 });
  }

  const rl = rateLimitWithRetry(`jobs:parse-screenshot:${user.id}`, 15, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many screenshot imports. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Upload a screenshot first." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large. Maximum size is 4 MB." }, { status: 413 });
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Only PNG, JPG, and WEBP images are accepted." }, { status: 415 });
    }
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPG, and WEBP images are accepted." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/png";

    const result = await parseJobScreenshotWithAI(base64Image, mimeType);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch {
    return NextResponse.json({ error: "Unable to read that screenshot right now." }, { status: 500 });
  }
}
