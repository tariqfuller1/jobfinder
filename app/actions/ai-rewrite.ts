"use server";

import { getGeminiModel } from "@/lib/gemini";

type RewriteType = "cover-letter" | "resume";

export async function regenerateWithSuggestion(
  type: RewriteType,
  currentDraft: string,
  suggestion: string,
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
): Promise<{ ok: true; draft: string } | { ok: false; error: string }> {
  try {
    const model = getGeminiModel();
    const label = type === "cover-letter" ? "cover letter" : "resume";
    const descSnippet = jobDescriptionText.slice(0, 1000);

    const prompt = `You are editing a ${label} for a job application.

Job: ${jobTitle} at ${jobCompany}${descSnippet ? `\nJob description excerpt:\n${descSnippet}` : ""}

Current ${label}:
${currentDraft}

The user wants this change: ${suggestion}

Rewrite the ${label} incorporating the requested change. Keep the same general structure and tone unless asked to change it. Return only the ${label} text with no extra commentary or markdown formatting.`;

    const result = await model.generateContent(prompt);
    const draft = result.response.text().trim();
    return { ok: true, draft };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("too many requests")) {
      return { ok: false, error: "The AI is temporarily rate-limited. Wait a moment and try again." };
    }
    if (message.includes("API_KEY") || message.includes("API key")) {
      return { ok: false, error: "Gemini API key is missing or invalid. Add GEMINI_API_KEY to your environment variables." };
    }
    return { ok: false, error: "Something went wrong generating the draft. Try again." };
  }
}
