"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient, formatGroqError } from "@/lib/groq";

type RewriteType = "cover-letter" | "resume";

export async function regenerateWithSuggestion(
  type: RewriteType,
  currentDraft: string,
  suggestion: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
): Promise<{ ok: true; draft: string } | { ok: false; error: string }> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };

  try {
    const groq = getGroqClient();
    const label = type === "cover-letter" ? "cover letter" : "resume";
    const descSnippet = jobDescriptionText.slice(0, 1000);

    const prompt = `You are editing a ${label} for a job application.

Job: ${jobTitle} at ${jobCompany}${descSnippet ? `\n<job_description>\n${descSnippet}\n</job_description>` : ""}

<current_draft>
${currentDraft.slice(0, 4000)}
</current_draft>

<requested_change>
${suggestion}
</requested_change>

Rewrite the ${label} incorporating the requested change. Keep the same general structure and tone unless asked to change it. Return only the ${label} text with no extra commentary or markdown formatting.`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      include_reasoning: false,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const draft = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!draft) return { ok: false, error: "AI returned an empty response. Try again." };
    return { ok: true, draft };
  } catch (err) {
    return { ok: false, error: formatGroqError(err) };
  }
}
