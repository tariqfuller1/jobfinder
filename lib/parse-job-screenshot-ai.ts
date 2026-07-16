import { getGroqClient } from "@/lib/groq";
import { parseJsonSafe } from "@/lib/safe-json";

export type ParsedJobScreenshot = {
  title?: string;
  company?: string;
  location?: string;
  applyUrl?: string;
  workplaceType: "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY" | "UNKNOWN";
  experienceLevel: "INTERN" | "ENTRY" | "MID" | "SENIOR" | "LEAD" | "UNKNOWN";
  descriptionText?: string;
};

const WORKPLACE_VALUES = new Set(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]);
const EMPLOYMENT_VALUES = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY", "UNKNOWN"]);
const EXPERIENCE_VALUES = new Set(["INTERN", "ENTRY", "MID", "SENIOR", "LEAD", "UNKNOWN"]);

// Groq's vision endpoint caps base64 image requests at 4 MB.
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function parseJobScreenshotWithAI(
  base64Image: string,
  mimeType: string,
): Promise<{ ok: true; data: ParsedJobScreenshot } | { ok: false; error: string }> {
  if (!base64Image) {
    return { ok: false, error: "No image to parse." };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) {
    return { ok: false, error: "GROQ_API_KEY is not configured. Add it to your environment variables and redeploy." };
  }

  try {
    const groq = getGroqClient();

    const prompt = `You must respond with ONLY a JSON object — no text before or after it, no markdown, no explanation.

Look at this screenshot of a job posting and extract the following JSON structure:

{
  "title": "Job title or null",
  "company": "Company name or null",
  "location": "City, State or Remote, or null",
  "applyUrl": "The apply/posting URL, ONLY if literally visible as text in the screenshot (e.g. a browser address bar), otherwise null",
  "workplaceType": "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN",
  "employmentType": "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY" | "UNKNOWN",
  "experienceLevel": "INTERN" | "ENTRY" | "MID" | "SENIOR" | "LEAD" | "UNKNOWN",
  "descriptionText": "The full job description text visible in the screenshot, formatted as plain text"
}

Rules:
- Only use information actually visible in the image — never invent a company, title, or URL.
- Use "UNKNOWN" for the enum fields when the screenshot doesn't make it clear.
- Use null for missing string fields.
- Transcribe descriptionText as completely as the image allows, preserving line breaks between sections/bullets.

Respond NOW with only the JSON object starting with { and ending with }:`;

    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a JSON API that extracts job posting details from screenshots. You ONLY output raw JSON. Never output text, explanation, or markdown. Your entire response must be a single valid JSON object starting with { and ending with }.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    if (!raw) {
      return { ok: false, error: "AI returned an empty response. Try again or fill the form manually." };
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      return { ok: false, error: "AI returned an unexpected format. Try again or fill the form manually." };
    }
    const parsed = parseJsonSafe(raw.slice(start, end + 1)) as Record<string, unknown>;

    const asString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const asEnum = (v: unknown, allowed: Set<string>) =>
      typeof v === "string" && allowed.has(v) ? (v as any) : "UNKNOWN";

    const data: ParsedJobScreenshot = {
      title: asString(parsed.title),
      company: asString(parsed.company),
      location: asString(parsed.location),
      applyUrl: asString(parsed.applyUrl),
      workplaceType: asEnum(parsed.workplaceType, WORKPLACE_VALUES),
      employmentType: asEnum(parsed.employmentType, EMPLOYMENT_VALUES),
      experienceLevel: asEnum(parsed.experienceLevel, EXPERIENCE_VALUES),
      descriptionText: asString(parsed.descriptionText),
    };

    if (!data.title && !data.company && !data.descriptionText) {
      return { ok: false, error: "Couldn't find job details in that screenshot. Try a clearer image or fill the form manually." };
    }

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      return { ok: false, error: "AI is rate-limited. Wait a moment and try again." };
    }
    return { ok: false, error: `Parse failed: ${message}` };
  }
}
