"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient } from "@/lib/groq";

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

Job: ${jobTitle} at ${jobCompany}${descSnippet ? `\nJob description excerpt:\n${descSnippet}` : ""}

Current ${label}:
${currentDraft}

The user wants this change: ${suggestion}

Rewrite the ${label} incorporating the requested change. Keep the same general structure and tone unless asked to change it. Return only the ${label} text with no extra commentary or markdown formatting.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const draft = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!draft) return { ok: false, error: "AI returned an empty response. Try again." };
    return { ok: true, draft };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit")) {
      return { ok: false, error: "The AI is temporarily rate-limited. Wait a moment and try again." };
    }
    if (message.includes("API key") || message.includes("auth")) {
      return { ok: false, error: "Groq API key is missing or invalid. Add GROQ_API_KEY to your environment variables." };
    }
    return { ok: false, error: "Something went wrong generating the draft. Try again." };
  }
}
