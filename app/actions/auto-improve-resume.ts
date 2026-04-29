"use server";

import { getGroqClient } from "@/lib/groq";
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
): Promise<{ resume: string; rating: QualityRating; feedback: string } | null> {
  const prompt = `You are an expert resume writer and ATS specialist.

This resume was rated "${rating}" for the ${jobTitle} role at ${jobCompany}.
Feedback: ${feedback}

Rewrite the resume to directly address this feedback and improve competitiveness for this specific role. Then re-evaluate the quality of the improved version.

Rules:
- Use ONLY the candidate's real experience — never fabricate skills or jobs
- Focus the rewrite on the specific weakness in the feedback
- Strengthen the professional summary to better match the role
- Make bullets more impactful and keyword-rich for this job
- Do not change the overall resume structure or format

JOB DESCRIPTION:
${jobDescriptionText.slice(0, 1500)}

CURRENT RESUME:
${currentResume}

Respond NOW with only this JSON starting with {:
{
  "qualityRating": "Excellent" | "Good" | "Fair" | "Poor",
  "qualityFeedback": "<2 sentences: new rating reason and one remaining improvement if any>",
  "improvedResume": "<complete improved resume as plain text, same format as input>"
}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are a JSON API that improves resumes. Your entire response must be a single valid JSON object starting with { and ending with }. No text, no markdown.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const raw = (completion.choices[0]?.message?.content ?? "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  const parsed = JSON.parse(raw.slice(start, end + 1));
  const newRating = typeof parsed.qualityRating === "string" && VALID_RATINGS.includes(parsed.qualityRating as QualityRating)
    ? (parsed.qualityRating as QualityRating)
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
): Promise<AutoImproveResult> {
  try {
    const groq = getGroqClient();
    let resume = currentResume;
    let rating = currentRating;
    let feedback = currentFeedback;
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS && (rating === "Fair" || rating === "Poor")) {
      attempts++;
      const result = await improveOnce(groq, resume, rating, feedback, jobTitle, jobCompany, jobDescriptionText);
      if (!result) break;
      resume = result.resume;
      rating = result.rating;
      feedback = result.feedback;
    }

    return { ok: true, optimizedResume: resume, qualityRating: rating, qualityFeedback: feedback, attempts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      return { ok: false, error: "AI is rate-limited. Wait a moment and try again." };
    }
    return { ok: false, error: "Auto-improve failed. Try using the manual refinement box." };
  }
}
