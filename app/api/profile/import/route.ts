import { NextResponse } from "next/server";
import { parseResumeText } from "@/lib/resume";
import { saveUserProfileForUser } from "@/lib/profile";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { parseResumeWithAI } from "@/lib/parse-resume-ai";
import { prisma } from "@/lib/db";
import { rateLimitWithRetry } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

async function extractResumeText(file: File) {
  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileName.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (fileName.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf8");
}

const MAX_PASTE_BYTES = 50_000; // ~12 pages of text

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to import a resume." }, { status: 401 });
  }

  const rl = rateLimitWithRetry(`resume:import:${user.id}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many resume imports. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const formData = await request.formData();
    const rawText = String(formData.get("resumeText") ?? "").trim();
    const text = rawText.slice(0, MAX_PASTE_BYTES);
    const file = formData.get("resumeFile");

    let extractedText = text;
    let fileName: string | undefined;

    if (!extractedText && file instanceof File && file.size > 0) {
      if (file.size > MAX_RESUME_BYTES) {
        return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 413 });
      }
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json({ error: "Only PDF, DOCX, and TXT files are accepted." }, { status: 415 });
      }
      extractedText = await extractResumeText(file);
      fileName = file.name;
    }

    if (!extractedText) {
      return NextResponse.json({ error: "Upload a resume file or paste resume text first." }, { status: 400 });
    }

    const parsedProfile = parseResumeText(extractedText, fileName);
    const saved = await saveUserProfileForUser(user.id, parsedProfile);

    // AI extraction runs in parallel — failures are non-fatal
    const aiResult = await parseResumeWithAI(extractedText).catch(() => null);
    if (aiResult?.ok) {
      const { workExperience, projects } = aiResult.data;
      await prisma.candidateProfile.update({
        where: { userId: user.id },
        data: {
          workExperience: JSON.stringify(workExperience),
          projects: JSON.stringify(projects),
        },
      }).catch(() => null);
    }

    return NextResponse.json({
      ok: true,
      aiParsed: aiResult?.ok ?? false,
      profile: {
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
        location: saved.location,
        headline: saved.headline,
        summary: saved.summary,
        educationEntries: saved.educationEntries,
        skills: saved.skills.slice(0, 16),
        schoolKeywords: saved.schoolKeywords,
        connectionKeywords: saved.connectionKeywords,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to import the resume right now." }, { status: 500 });
  }
}
