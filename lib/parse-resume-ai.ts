import { getGroqClient } from "@/lib/groq";
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

    const prompt = `Parse this resume into structured JSON. Extract all information accurately and completely.

Resume:
${resumeText.slice(0, 4000)}

Return a JSON object with this exact structure:
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
- IDs must be unique: exp-1, exp-2, proj-1, proj-2, etc.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a resume parser. Respond with valid JSON only, no markdown or extra text." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    // Strip markdown fences if the model wrapped the JSON despite json_object mode
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr);

    const data: ParsedResumeAI = {
      name: parsed.name ?? undefined,
      email: parsed.email ?? undefined,
      phone: parsed.phone ?? undefined,
      location: parsed.location ?? undefined,
      headline: parsed.headline ?? undefined,
      summary: parsed.summary ?? undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      stacks: Array.isArray(parsed.stacks) ? parsed.stacks.map(String) : [],
      educationEntries: Array.isArray(parsed.educationEntries) ? parsed.educationEntries.map(String) : [],
      workExperience: Array.isArray(parsed.workExperience)
        ? parsed.workExperience.map((e: any, i: number) => ({
            id: String(e.id ?? `exp-${i + 1}`),
            company: String(e.company ?? ""),
            title: String(e.title ?? ""),
            location: e.location ? String(e.location) : undefined,
            startDate: String(e.startDate ?? ""),
            endDate: String(e.endDate ?? ""),
            bullets: Array.isArray(e.bullets) ? e.bullets.map(String).filter(Boolean) : [],
          }))
        : [],
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((p: any, i: number) => ({
            id: String(p.id ?? `proj-${i + 1}`),
            name: String(p.name ?? ""),
            url: p.url ? String(p.url) : undefined,
            technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : [],
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
