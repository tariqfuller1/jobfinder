"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient } from "@/lib/groq";
import { parseJsonSafe } from "@/lib/safe-json";
import type { WorkExperienceEntry } from "@/lib/profile";

export async function generateCoverLetterAI(
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
  name: string,
  email: string,
  phone: string,
  summary: string,
  skills: string[],
  stacks: string[],
  workExperience: WorkExperienceEntry[],
  educationEntries: string[],
  profileLinks: { label: string; url: string }[],
): Promise<{ ok: true; letter: string } | { ok: false; error: string }> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to generate cover letters." };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) {
    return { ok: false, error: "GROQ_API_KEY is not configured." };
  }

  try {
    const groq = getGroqClient();

    const expSummary = workExperience
      .slice(0, 2)
      .map((e) => `${e.title} at ${e.company} (${e.startDate}–${e.endDate}): ${e.bullets.slice(0, 2).join("; ")}`)
      .join("\n");

    const linksLine = profileLinks.length > 0
      ? profileLinks.map((l) => `${l.label}: ${l.url}`).join(" | ")
      : "";

    const prompt = `You are an expert cover letter writer. Write a polished, professional, and specific cover letter for this job application.

JOB: ${jobTitle} at ${jobCompany}

JOB DESCRIPTION:
${jobDescriptionText.slice(0, 2000)}

CANDIDATE:
Name: ${name || "Candidate"}
${email ? `Email: ${email}` : ""}
${phone ? `Phone: ${phone}` : ""}
${linksLine ? `Links: ${linksLine}` : ""}
${summary ? `Summary: ${summary}` : ""}
Skills: ${[...skills, ...stacks].slice(0, 15).join(", ")}
${expSummary ? `Recent experience:\n${expSummary}` : ""}
${educationEntries.length ? `Education: ${educationEntries[0]}` : ""}

RULES:
- Write 3-4 strong paragraphs (no headers, no bullet points)
- Opening: express specific interest in this company and role — use details from the job description
- Middle: connect the candidate's real skills and experience to the role's requirements concisely
- Closing: confident call to action
- Tone: professional but human — not robotic or generic
- Do NOT fabricate experience, titles, or companies
- Keep it to one page (~300-400 words)
- Start with "Dear Hiring Team at ${jobCompany},"
- End with "Sincerely,\\n${name || "Candidate"}"

Respond with only a JSON object:
{"letter": "<complete cover letter as plain text with real newlines>"}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a cover letter writer API. Output only a raw JSON object with a single 'letter' key. No markdown, no explanation." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }

    const parsed = parseJsonSafe(raw.slice(start, end + 1)) as Record<string, unknown>;
    const letter = typeof parsed.letter === "string" ? parsed.letter.trim() : "";
    if (!letter) return { ok: false, error: "AI returned an empty letter. Try again." };

    return { ok: true, letter };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      return { ok: false, error: "AI is rate-limited. Wait a moment and try again." };
    }
    return { ok: false, error: `Generation failed: ${message}` };
  }
}
