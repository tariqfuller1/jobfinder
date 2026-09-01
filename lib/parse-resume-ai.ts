import { getGroqClient } from "@/lib/groq";
import { parseJsonSafe } from "@/lib/safe-json";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";

export type ParsedResumeAI = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  stacks: string[];
  educationEntries: string[];
  workExperience: WorkExperienceEntry[];
  projects: ProjectEntry[];
};

export async function parseResumeWithAI(resumeText: string): Promise<
  { ok: true; data: ParsedResumeAI } | { ok: false; error: string }
> {
  if (!resumeText.trim()) {
    return { ok: false, error: "No resume text to parse." };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) {
    return { ok: false, error: "GROQ_API_KEY is not configured. Add it to your environment variables and redeploy." };
  }

  try {
    const groq = getGroqClient();

    const prompt = `You must respond with ONLY a JSON object — no text before or after it, no markdown, no explanation.

Parse this resume and return the following JSON structure (fill in all values from the resume):

{
  "name": "Full Name or null",
  "email": "email or null",
  "phone": "phone number or null",
  "location": "City, State or null",
  "headline": "one-line professional headline",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2"],
  "stacks": ["framework1", "tool1"],
  "educationEntries": ["BS Computer Science, University Name, 2020"],
  "workExperience": [
    {
      "id": "exp-1",
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State or Remote",
      "startDate": "Jan 2022",
      "endDate": "Present",
      "bullets": ["Accomplished X by doing Y which resulted in Z"]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "Project Name",
      "url": "https://... or null",
      "technologies": ["React", "Node.js"],
      "bullets": ["What it does and the impact"]
    }
  ]
}

Rules:
- Include ALL work experience found, newest first
- Include ALL projects found
- Keep bullets exactly as written — do not summarize
- Use null for missing string fields, [] for missing arrays
- IDs must be unique: exp-1, exp-2, proj-1, proj-2, etc.

RESUME TEXT:
${resumeText.slice(0, 4000)}

Respond NOW with only the JSON object starting with { and ending with }:`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      include_reasoning: false,
      messages: [
        { role: "system", content: "You are a JSON API that parses resumes. You ONLY output raw JSON. Never output text, explanation, or markdown. Your entire response must be a single valid JSON object starting with { and ending with }." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    if (!raw) {
      return { ok: false, error: "AI returned an empty response. Try again or add entries manually." };
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      return { ok: false, error: "AI returned an unexpected format. Try again or add entries manually." };
    }
    const parsed = parseJsonSafe(raw.slice(start, end + 1)) as Record<string, unknown>;

    const data: ParsedResumeAI = {
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
      location: typeof parsed.location === "string" ? parsed.location : undefined,
      headline: typeof parsed.headline === "string" ? parsed.headline : undefined,
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      stacks: Array.isArray(parsed.stacks) ? parsed.stacks.map(String) : [],
      educationEntries: Array.isArray(parsed.educationEntries) ? parsed.educationEntries.map(String) : [],
      workExperience: Array.isArray(parsed.workExperience)
        ? parsed.workExperience
            .filter((e: any) => e && (String(e.company ?? "").trim() || String(e.title ?? "").trim()))
            .map((e: any, i: number) => ({
              id: String(e.id ?? `exp-${i + 1}`),
              company: String(e.company ?? "").trim(),
              title: String(e.title ?? "").trim(),
              location: e.location ? String(e.location) : undefined,
              startDate: String(e.startDate ?? ""),
              endDate: String(e.endDate ?? ""),
              bullets: Array.isArray(e.bullets) ? e.bullets.map(String).filter(Boolean) : [],
            }))
        : [],
      projects: Array.isArray(parsed.projects)
        ? parsed.projects
            .filter((p: any) => p && String(p.name ?? "").trim())
            .map((p: any, i: number) => ({
              id: String(p.id ?? `proj-${i + 1}`),
              name: String(p.name ?? "").trim(),
              url: p.url ? String(p.url) : undefined,
              technologies: Array.isArray(p.technologies) ? p.technologies.map(String).filter(Boolean) : [],
              bullets: Array.isArray(p.bullets) ? p.bullets.map(String).filter(Boolean) : [],
            }))
        : [],
    };

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      return { ok: false, error: "AI is rate-limited. Wait a moment and try again." };
    }
    return { ok: false, error: `Parse failed: ${message}` };
  }
}
