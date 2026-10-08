import { getGroqClient } from "@/lib/groq";
import { parseJsonSafe } from "@/lib/safe-json";
import type { UserProfile } from "@/lib/profile";
import { needsAi } from "@/lib/auto-apply/answers";
import type { AutoApplyField } from "@/lib/auto-apply/types";

type JobContext = { title: string; company: string; descriptionText: string | null };

// Small batches keep each request (prompt + max_tokens) under Groq's
// per-minute token budget — long-answer questions can each run ~300 tokens.
const BATCH_SIZE = 4;

function candidateBlock(profile: UserProfile) {
  const experience = profile.workExperience
    .filter((e) => e.includedInResume !== false)
    .slice(0, 4)
    .map((e) => `${e.title} at ${e.company} (${e.startDate}–${e.endDate}): ${(e.bullets ?? []).slice(0, 3).join("; ")}`)
    .join("\n");
  const projects = profile.projects
    .filter((p) => p.includedInResume !== false)
    .slice(0, 3)
    .map((p) => `${p.name}${p.technologies.length ? ` [${p.technologies.join(", ")}]` : ""}: ${(p.bullets ?? []).slice(0, 2).join("; ")}`)
    .join("\n");

  return [
    `Name: ${profile.name}`,
    profile.location ? `Location: ${profile.location}` : "",
    profile.headline ? `Headline: ${profile.headline}` : "",
    profile.summary ? `Summary: ${profile.summary}` : "",
    `Skills: ${[...profile.skills, ...profile.stacks].slice(0, 25).join(", ")}`,
    experience ? `Work experience:\n${experience}` : "",
    projects ? `Projects:\n${projects}` : "",
    profile.educationEntries.length ? `Education: ${profile.educationEntries.slice(0, 2).join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function describeQuestion(field: AutoApplyField, index: number) {
  const kind =
    field.type === "select"
      ? `choose exactly one of: ${field.options!.map((o) => JSON.stringify(o.label)).join(", ")}`
      : field.type === "multiselect"
        ? `choose one or more of: ${field.options!.map((o) => JSON.stringify(o.label)).join(", ")}`
        : /cover letter/i.test(field.label)
          ? "a cover letter, 3 short paragraphs"
          : field.type === "textarea"
            ? "a paragraph answer, 80–180 words"
            : "a short answer, one line";
  return `${index}. ${field.label}${field.description ? ` (${field.description.slice(0, 200)})` : ""}\n   Format: ${kind}`;
}

function toFieldValue(field: AutoApplyField, raw: unknown): string | string[] | null {
  if (field.type === "select" || field.type === "multiselect") {
    const labels = (Array.isArray(raw) ? raw : [raw]).map((v) => String(v ?? "").trim().toLowerCase()).filter(Boolean);
    const values = field.options!.filter((o) => labels.includes(o.label.trim().toLowerCase())).map((o) => o.value);
    if (!values.length) return null;
    return field.type === "select" ? values[0] : values;
  }
  const text = typeof raw === "string" ? raw.trim() : "";
  return text || null;
}

async function draftBatch(batch: AutoApplyField[], job: JobContext, profile: UserProfile) {
  const prompt = `You are filling out a job application on behalf of the candidate below. Answer each question truthfully using only the candidate's information.

JOB: ${job.title} at ${job.company}
<job_description>
${(job.descriptionText ?? "").slice(0, 1500)}
</job_description>

<candidate>
${candidateBlock(profile)}
</candidate>

<questions>
${batch.map((f, i) => describeQuestion(f, i)).join("\n")}
</questions>

Rules:
- Never invent employers, degrees, dates, numbers, or skills that are not in the candidate's information.
- If the candidate's information doesn't let you answer a question honestly, return an empty string for it.
- For choice questions, return the option text exactly as written.
- Written answers should sound like a real person, reference specific experience, and connect to this job.

Respond with only a JSON object: {"answers": [{"id": 0, "answer": "..."}, ...]}`;

  const completion = await getGroqClient().chat.completions.create({
    model: "openai/gpt-oss-120b",
    include_reasoning: false,
    messages: [
      { role: "system", content: "You fill out job applications. You ONLY output a single raw JSON object." },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 2500,
  });

  const raw = (completion.choices[0]?.message?.content ?? "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return new Map<number, unknown>();
  const parsed = parseJsonSafe(raw.slice(start, end + 1)) as { answers?: Array<{ id: number; answer: unknown }> };
  return new Map((parsed.answers ?? []).map((a) => [Number(a.id), a.answer]));
}

/**
 * Drafts answers for required, non-sensitive questions the profile couldn't
 * answer directly. Failures are non-fatal — those fields stay "missing" and
 * the user fills them in on the review page.
 */
export async function draftAiAnswers(fields: AutoApplyField[], job: JobContext, profile: UserProfile) {
  if (!process.env.GROQ_API_KEY?.trim()) return fields;

  const pending = fields.filter(needsAi);
  const drafted = new Map<AutoApplyField, string | string[]>();

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    try {
      const answers = await draftBatch(batch, job, profile);
      batch.forEach((field, index) => {
        const value = toFieldValue(field, answers.get(index));
        if (value) drafted.set(field, value);
      });
    } catch (err) {
      console.error("[auto-apply] AI drafting failed:", err instanceof Error ? err.message : err);
    }
  }

  return fields.map((field) => {
    const value = drafted.get(field);
    return value ? { ...field, value, source: "ai" as const } : field;
  });
}
