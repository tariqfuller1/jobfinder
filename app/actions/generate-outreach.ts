"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient, formatGroqError } from "@/lib/groq";
import { parseJsonSafe } from "@/lib/safe-json";
import type { WorkExperienceEntry } from "@/lib/profile";

export type MessageType = "linkedin" | "cold-email" | "informational" | "follow-up";

const TYPE_INSTRUCTIONS: Record<MessageType, string> = {
  "linkedin": `Write a LinkedIn connection request message.
RULES:
- Maximum 300 characters total (LinkedIn limit)
- One or two sentences only — no lists, no headers
- Personal and specific to the company/role, not generic
- End with your name OR no sign-off (space is tight)
- Do NOT start with "Hi [Name]" — start with a brief hook`,

  "cold-email": `Write a cold outreach email.
RULES:
- Include a subject line on the first line formatted as: Subject: [your subject]
- Then a blank line, then the body
- 3 short paragraphs: (1) specific reason you're reaching out to THIS company, (2) your relevant background, (3) clear ask
- Keep under 200 words in the body
- Tone: professional but human — not a cover letter, not a sales pitch
- Sign off with: Best,\\n[Name]`,

  "informational": `Write an informational interview request message.
RULES:
- Short — under 120 words
- Ask for 15-20 minutes to learn about their team/role, not to ask for a job
- Show you've done research (reference company focus or something specific)
- Low pressure: "no worries if you're too busy"
- Sign off with: Thanks,\\n[Name]`,

  "follow-up": `Write a follow-up message after no response to a previous outreach.
RULES:
- Reference that you reached out previously (don't mention specific date)
- Keep it SHORT — 3-4 sentences max
- Provide one new piece of value or context (recent project, relevant skill, specific interest)
- No guilt-tripping, no "just checking in"
- Sign off with: Best,\\n[Name]`,
};

export async function generateOutreachMessage(
  messageType: MessageType,
  companyName: string,
  companyNotes: string,
  companyFocus: string[],
  relatedRole: string,
  recipientRole: string,
  name: string,
  summary: string,
  skills: string[],
  stacks: string[],
  workExperience: WorkExperienceEntry[],
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };

  try {
    const groq = getGroqClient();

    const expLine = workExperience
      .slice(0, 2)
      .map((e) => `${e.title} at ${e.company}`)
      .join(", ");

    const focusLine = companyFocus.slice(0, 5).join(", ") || "software development";
    const roleContext = relatedRole ? `Role of interest: ${relatedRole}` : "";
    const recipientContext = recipientRole ? `Recipient is: ${recipientRole}` : "Recipient role: unknown (write generically)";

    const prompt = `${TYPE_INSTRUCTIONS[messageType]}

COMPANY: ${companyName}
${roleContext}
${companyNotes ? `Company notes: ${companyNotes.slice(0, 800)}` : ""}
Company focus areas: ${focusLine}
${recipientContext}

SENDER:
Name: ${name || "Candidate"}
${summary ? `Background: ${summary}` : ""}
Skills: ${[...skills, ...stacks].slice(0, 10).join(", ")}
${expLine ? `Experience: ${expLine}` : ""}

Respond with only a JSON object: {"message": "<the message as plain text with real newlines>"}`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      include_reasoning: false,
      messages: [
        { role: "system", content: "You are an outreach message writer. Output only a raw JSON object with a single 'message' key. No markdown, no explanation." },
        { role: "user", content: prompt },
      ],
      temperature: 0.55,
      max_tokens: 800,
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return { ok: false, error: "AI returned an unexpected format. Try again." };

    const parsed = parseJsonSafe(raw.slice(start, end + 1)) as Record<string, unknown>;
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (!message) return { ok: false, error: "AI returned an empty message. Try again." };

    return { ok: true, message };
  } catch (err) {
    return { ok: false, error: formatGroqError(err) };
  }
}

export async function refineOutreachMessage(
  currentMessage: string,
  suggestion: string,
  messageType: MessageType,
  companyName: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };

  try {
    const groq = getGroqClient();

    const prompt = `You are editing an outreach message for ${companyName}. The message type is: ${messageType}.

<current_message>
${currentMessage.slice(0, 2000)}
</current_message>

<requested_change>
${suggestion}
</requested_change>

Rewrite the message applying the requested change. Keep the same message type and length constraints.
Respond with only a JSON object: {"message": "<rewritten message as plain text with real newlines>"}`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      include_reasoning: false,
      messages: [
        { role: "system", content: "You are an outreach message editor. Output only a raw JSON object with a single 'message' key." },
        { role: "user", content: prompt },
      ],
      temperature: 0.45,
      max_tokens: 600,
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return { ok: false, error: "AI returned an unexpected format. Try again." };

    const parsed = parseJsonSafe(raw.slice(start, end + 1)) as Record<string, unknown>;
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (!message) return { ok: false, error: "AI returned an empty message. Try again." };

    return { ok: true, message };
  } catch (err) {
    return { ok: false, error: formatGroqError(err) };
  }
}
