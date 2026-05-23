"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient } from "@/lib/groq";
import type { WorkExperienceEntry } from "@/lib/profile";

function groqError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return "AI is rate-limited. Wait a moment and try again.";
  }
  if (message.includes("API key") || message.includes("auth")) {
    return "Groq API key is missing or invalid.";
  }
  return "Something went wrong. Try again.";
}

export async function generateAppAnswer(
  question: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
  name: string,
  summary: string,
  skills: string[],
  stacks: string[],
  workExperience: WorkExperienceEntry[],
): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) return { ok: false, error: "GROQ_API_KEY is not configured." };

  try {
    const groq = getGroqClient();

    const expSummary = workExperience
      .slice(0, 3)
      .map((e) => `${e.title} at ${e.company} (${e.startDate}–${e.endDate}): ${(e.bullets ?? []).slice(0, 2).join("; ")}`)
      .join("\n");

    const prompt = `You are helping a job candidate write a compelling, honest answer to an application question.

JOB: ${jobTitle} at ${jobCompany}
<job_description>
${jobDescriptionText.slice(0, 1500)}
</job_description>

<candidate>
Name: ${name || "Candidate"}
${summary ? `Summary: ${summary}` : ""}
Skills: ${[...skills, ...stacks].slice(0, 15).join(", ")}
${expSummary ? `Recent experience:\n${expSummary}` : ""}
</candidate>

APPLICATION QUESTION: "${question}"

Write a concise, specific, and authentic answer (2-4 paragraphs max). Use the candidate's real background. Connect their experience directly to this company and role. Do not fabricate facts. Sound human, not generic or robotic. Return only the answer text with no preamble or labels.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You write application question answers. Return only the answer text, no commentary." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!answer) return { ok: false, error: "AI returned an empty response. Try again." };
    return { ok: true, answer };
  } catch (err) {
    return { ok: false, error: groqError(err) };
  }
}

export async function refineAppAnswer(
  currentAnswer: string,
  refinementNote: string,
  question: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) return { ok: false, error: "GROQ_API_KEY is not configured." };

  try {
    const groq = getGroqClient();

    const prompt = `You are editing a job application answer.

Job: ${jobTitle} at ${jobCompany}
${jobDescriptionText ? `<job_description>\n${jobDescriptionText.slice(0, 800)}\n</job_description>` : ""}

Application question: "${question}"

<current_answer>
${currentAnswer}
</current_answer>

<requested_change>
${refinementNote}
</requested_change>

Rewrite the answer incorporating the requested change. Keep it concise and authentic. Return only the answer text with no preamble or labels.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You edit application answers. Return only the revised answer text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!answer) return { ok: false, error: "AI returned an empty response. Try again." };
    return { ok: true, answer };
  } catch (err) {
    return { ok: false, error: groqError(err) };
  }
}
