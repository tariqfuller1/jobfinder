"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient, formatGroqError } from "@/lib/groq";
import { parseJsonSafe } from "@/lib/safe-json";
import type { QualityRating } from "./ats-check";

export type AutoImproveResult =
  | {
      ok: true;
      optimizedResume: string;
      qualityRating: QualityRating;
      qualityFeedback: string;
      attempts: number;
    }
  | { ok: false; error: string };

const VALID_RATINGS: QualityRating[] = ["Excellent", "Good", "Fair", "Poor"];
const MAX_ATTEMPTS = 3;

async function improveOnce(
  groq: ReturnType<typeof getGroqClient>,
  currentResume: string,
  rating: QualityRating,
  feedback: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
  profileLinks: { label: string; url: string }[],
): Promise<{ resume: string; rating: QualityRating; feedback: string } | null> {
  const linksNote = profileLinks.length > 0
    ? `\n- Preserve these links in the contact line: ${profileLinks.map((l) => `${l.label}: ${l.url}`).join(" | ")}`
    : "";

  const prompt = `You are an expert resume writer and ATS specialist.

This resume was rated "${rating}" for the ${jobTitle} role at ${jobCompany}.
Feedback: ${feedback}

Rewrite the resume to directly address this feedback and improve competitiveness for this specific role. Then re-evaluate the quality of the improved version.

Rules:
- Use ONLY the candidate's real experience — never fabricate skills or jobs
- Keep ALL sections present (PROJECTS, WORK EXPERIENCE, etc.) — never remove any section
- Focus the rewrite on the specific weakness in the feedback
- Strengthen the professional summary to better match the role
- Make bullets more impactful and keyword-rich for this job
- Do not change the overall resume structure or format${linksNote}

<job_description>
${jobDescriptionText.slice(0, 1500)}
</job_description>

<current_resume>
${currentResume.slice(0, 4000)}
</current_resume>

Respond NOW with only this JSON starting with {:
{
  "qualityRating": "Excellent" | "Good" | "Fair" | "Poor",
  "qualityFeedback": "<2 sentences: new rating reason and one remaining improvement if any>",
  "improvedResume": "<complete improved resume as plain text, same format as input>"
}`;

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    include_reasoning: false,
    messages: [
      {
        role: "system",
        content: "You are a JSON API that improves resumes. Your entire response must be a single valid JSON object starting with { and ending with }. No text, no markdown.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    // Groq's free-tier TPM budget for this model is 8,000 tokens/minute total
    // (prompt + max_tokens together), and this loop can fire up to MAX_ATTEMPTS
    // calls back to back — keep each call well under the ceiling.
    max_tokens: 2500,
  });

  const raw = (completion.choices[0]?.message?.content ?? "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  const parsed = parseJsonSafe(raw.slice(start, end + 1)) as Record<string, unknown>;
  const rawRating = typeof parsed.qualityRating === "string" ? parsed.qualityRating.trim() : "";
  const newRating = VALID_RATINGS.includes(rawRating as QualityRating)
    ? (rawRating as QualityRating)
    : rating;

  return {
    resume: typeof parsed.improvedResume === "string" ? parsed.improvedResume.trim() : currentResume,
    rating: newRating,
    feedback: typeof parsed.qualityFeedback === "string" ? parsed.qualityFeedback.trim() : feedback,
  };
}

export async function autoImproveResume(
  currentResume: string,
  currentRating: QualityRating,
  currentFeedback: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
  profileLinks: { label: string; url: string }[] = [],
): Promise<AutoImproveResult> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };

  let groq: ReturnType<typeof getGroqClient>;
  try {
    groq = getGroqClient();
  } catch (err) {
    return { ok: false, error: formatGroqError(err) };
  }

  let resume = currentResume;
  let rating = currentRating;
  let feedback = currentFeedback;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS && (rating === "Fair" || rating === "Poor")) {
    attempts++;
    try {
      const result = await improveOnce(groq, resume, rating, feedback, jobTitle, jobCompany, jobDescriptionText, profileLinks);
      if (!result) break;
      resume = result.resume;
      rating = result.rating;
      feedback = result.feedback;
    } catch {
      // Keep whatever was improved in prior attempts rather than discarding it —
      // a later attempt failing (e.g. hitting Groq's per-minute token budget)
      // shouldn't throw away progress already made.
      break;
    }
  }

  return { ok: true, optimizedResume: resume, qualityRating: rating, qualityFeedback: feedback, attempts };
}
