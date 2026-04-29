"use server";

import { getGroqClient } from "@/lib/groq";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";

type ParsedResume = {
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

export async function parseResumeToStructured(
  resumeText: string,
): Promise<{ ok: true; data: ParsedResume } | { ok: false; error: string }> {
  if (!resumeText.trim()) {
    return { ok: false, error: "No resume text to parse. Upload your resume first." };
  }

  try {
    const groq = getGroqClient();

    const prompt = `Parse this resume into structured JSON. Extract all information accurately.

Resume:
${resumeText.slice(0, 4000)}

Return a JSON object with this exact structure:
{
  "name": "Full Name or null",
  "email": "email or null",
  "phone": "phone or null",
  "location": "City, State or null",
  "headline": "one-line professional headline summarizing their role",
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
      "bullets": [
        "Action verb + what you did + result/impact",
        "Another bullet"
      ]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "Project Name",
      "url": "https://url or null",
      "technologies": ["React", "Node.js"],
      "bullets": [
        "What the project does and the impact"
      ]
    }
  ]
}

Rules:
- Include ALL work experience entries found, in reverse chronological order
- Include ALL projects found
- Split experience bullets exactly as written, do not summarize or combine
- If a field is not found, use null for strings or [] for arrays
- IDs must be unique strings like "exp-1", "exp-2", "proj-1"`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a resume parser. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const data: ParsedResume = {
      name: parsed.name ?? undefined,
      email: parsed.email ?? undefined,
      phone: parsed.phone ?? undefined,
      location: parsed.location ?? undefined,
      headline: parsed.headline ?? undefined,
      summary: parsed.summary ?? undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      stacks: Array.isArray(parsed.stacks) ? parsed.stacks.map(String) : [],
      educationEntries: Array.isArray(parsed.educationEntries) ? parsed.educationEntries.map(String) : [],
      workExperience: Array.isArray(parsed.workExperience) ? parsed.workExperience.map((e: any, i: number) => ({
        id: e.id ?? `exp-${i + 1}`,
        company: e.company ?? "",
        title: e.title ?? "",
        location: e.location ?? undefined,
        startDate: e.startDate ?? "",
        endDate: e.endDate ?? "",
        bullets: Array.isArray(e.bullets) ? e.bullets.map(String) : [],
      })) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.map((p: any, i: number) => ({
        id: p.id ?? `proj-${i + 1}`,
        name: p.name ?? "",
        url: p.url ?? undefined,
        technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : [],
        bullets: Array.isArray(p.bullets) ? p.bullets.map(String) : [],
      })) : [],
    };

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      return { ok: false, error: "AI is rate-limited. Wait a moment and try again." };
    }
    return { ok: false, error: "Failed to parse resume. Try again." };
  }
}
