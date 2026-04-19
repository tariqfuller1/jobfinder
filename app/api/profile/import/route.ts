import { NextResponse } from "next/server";
import { parseResumeText } from "@/lib/resume";
import { saveUserProfileForUser } from "@/lib/profile";
import { getCurrentUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to import a resume." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const text = String(formData.get("resumeText") ?? "").trim();
    const file = formData.get("resumeFile");

    let extractedText = text;
    let fileName: string | undefined;

    if (!extractedText && file instanceof File && file.size > 0) {
      extractedText = await extractResumeText(file);
      fileName = file.name;
    }

    if (!extractedText) {
      return NextResponse.json({ error: "Upload a resume file or paste resume text first." }, { status: 400 });
    }

    const parsedProfile = parseResumeText(extractedText, fileName);
    const saved = await saveUserProfileForUser(user.id, parsedProfile);

    return NextResponse.json({
      ok: true,
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import the resume right now." },
      { status: 500 },
    );
  }
}
