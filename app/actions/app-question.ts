"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient, formatGroqError } from "@/lib/groq";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";

async function guardAI(): Promise<{ ok: false; error: string } | null> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };
  if (!process.env.GROQ_API_KEY?.trim()) return { ok: false, error: "GROQ_API_KEY is not configured." };
  return null;
}

function buildCandidateBlock(
  name: string,
  headline: string,
  summary: string,
  skills: string[],
  stacks: string[],
  workExperience: WorkExperienceEntry[],
  projects: ProjectEntry[],
  educationEntries: string[],
): string {
  const expSummary = workExperience
    .slice(0, 4)
    .map((e) => `${e.title} at ${e.company} (${e.startDate}–${e.endDate}): ${(e.bullets ?? []).slice(0, 3).join("; ")}`)
    .join("\n");

  const projectSummary = projects
    .slice(0, 4)
    .map((p) => {
      const techs = p.technologies?.length ? `[${p.technologies.join(", ")}]` : "";
      const bullets = (p.bullets ?? []).slice(0, 2).join("; ");
      const url = p.url ? ` (${p.url})` : "";
      return `Project: ${p.name}${url} ${techs}${bullets ? ` — ${bullets}` : ""}`;
    })
    .join("\n");

  const skillList = skills.length >= 20
    ? skills.slice(0, 20)
    : [...skills, ...stacks.slice(0, 20 - skills.length)];

  return [
    `Name: ${name || "Candidate"}`,
    headline ? `Headline: ${headline}` : "",
    summary ? `Summary: ${summary}` : "",
    `Skills: ${skillList.join(", ")}`,
    expSummary ? `Work experience:\n${expSummary}` : "",
    projectSummary ? `Projects:\n${projectSummary}` : "",
    educationEntries.length ? `Education: ${educationEntries.slice(0, 2).join("; ")}` : "",
  ].filter(Boolean).join("\n");
}

export async function generateAppAnswer(
  question: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
  name: string,
  headline: string,
  summary: string,
  skills: string[],
  stacks: string[],
  workExperience: WorkExperienceEntry[],
  projects: ProjectEntry[],
  educationEntries: string[],
): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  const guard = await guardAI();
  if (guard) return guard;

  try {
    const groq = getGroqClient();
    const candidate = buildCandidateBlock(name, headline, summary, skills, stacks, workExperience, projects, educationEntries);

    const prompt = `You are helping a job candidate write a compelling, honest answer to an application question.

JOB: ${jobTitle} at ${jobCompany}
<job_description>
${jobDescriptionText.slice(0, 1500)}
</job_description>

<candidate>
${candidate}
</candidate>

APPLICATION QUESTION: "${question}"

Write a concise, specific, and authentic answer (2-4 paragraphs max). Reference real projects, roles, or technologies from the candidate's background — including personal and side projects — when they are relevant to the question. Connect their experience directly to this company and role. Do not fabricate facts. Sound human, not generic or robotic. Return only the answer text with no preamble or labels.`;

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
    return { ok: false, error: formatGroqError(err) };
  }
}

export async function refineAppAnswer(
  currentAnswer: string,
  refinementNote: string,
  question: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
  name: string,
  headline: string,
  summary: string,
  skills: string[],
  stacks: string[],
  workExperience: WorkExperienceEntry[],
  projects: ProjectEntry[],
  educationEntries: string[],
): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  const guard = await guardAI();
  if (guard) return guard;

  try {
    const groq = getGroqClient();
    const candidate = buildCandidateBlock(name, headline, summary, skills, stacks, workExperience, projects, educationEntries);

    const prompt = `You are editing a job application answer.

Job: ${jobTitle} at ${jobCompany}
${jobDescriptionText ? `<job_description>\n${jobDescriptionText.slice(0, 800)}\n</job_description>` : ""}

<candidate>
${candidate}
</candidate>

Application question: "${question}"

<current_answer>
${currentAnswer}
</current_answer>

<requested_change>
${refinementNote}
</requested_change>

Rewrite the answer incorporating the requested change. Draw on the candidate's real background when relevant. Keep it concise and authentic. Return only the answer text with no preamble or labels.`;

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
    return { ok: false, error: formatGroqError(err) };
  }
}
