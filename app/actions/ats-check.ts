"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGroqClient } from "@/lib/groq";
import { parseJsonSafe } from "@/lib/safe-json";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";

export type QualityRating = "Excellent" | "Good" | "Fair" | "Poor";

export type ATSCheckResult =
  | {
      ok: true;
      score: number;
      matchedKeywords: string[];
      missingKeywords: string[];
      optimizedResume: string;
      qualityRating: QualityRating;
      qualityFeedback: string;
    }
  | { ok: false; error: string };

function formatExperience(entries: WorkExperienceEntry[]): string {
  return entries.map((e) => {
    const header = `${e.company} | ${e.title}${e.location ? ` | ${e.location}` : ""} | ${e.startDate} – ${e.endDate}`;
    const bullets = e.bullets.filter(Boolean).map((b) => `• ${b}`).join("\n");
    return `${header}\n${bullets}`;
  }).join("\n\n");
}

function formatProjects(entries: ProjectEntry[]): string {
  return entries.map((p) => {
    const header = `${p.name}${p.technologies.length ? ` | ${p.technologies.join(", ")}` : ""}${p.url ? ` | ${p.url}` : ""}`;
    const bullets = p.bullets.filter(Boolean).map((b) => `• ${b}`).join("\n");
    return `${header}\n${bullets}`;
  }).join("\n\n");
}

// Build a keyword set from the job description (meaningful words only)
function jobKeywords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [])
    .filter((w) => !["and","the","for","with","that","this","are","was","were","have","has","from","into","our","your","their","will","been","not","you","all","can","its"].includes(w)));
}

// Score an entry by counting keyword matches in its text
function scoreEntry(text: string, keywords: Set<string>): number {
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  return words.filter((w) => keywords.has(w)).length;
}

// Return up to `max` best-matching entries, preserving original order among winners
function pickBest<T>(entries: T[], getText: (e: T) => string, keywords: Set<string>, max: number): T[] {
  if (entries.length <= max) return entries;
  const scored = entries.map((e, i) => ({ e, i, score: scoreEntry(getText(e), keywords) }));
  const top = scored.sort((a, b) => b.score - a.score).slice(0, max);
  return top.sort((a, b) => a.i - b.i).map(({ e }) => e);
}

export async function runATSCheck(
  jobTitle: string,
  jobCompany: string,
  jobDescriptionText: string,
  workExperience: WorkExperienceEntry[],
  projects: ProjectEntry[],
  skills: string[],
  stacks: string[],
  educationEntries: string[],
  name: string,
  resumeText: string,
  profileLinks: { label: string; url: string }[],
): Promise<ATSCheckResult> {
  if (!await getCurrentUser()) return { ok: false, error: "Sign in to use AI features." };

  const hasStructuredData = workExperience.length > 0 || projects.length > 0;
  const hasResume = resumeText.trim().length > 0;

  if (!hasStructuredData && !hasResume) {
    return { ok: false, error: "No resume or work experience found on your profile. Add your resume or fill in your work experience first." };
  }

  try {
    const groq = getGroqClient();

    // Pick the 2 most relevant entries when the profile has more than 2
    const keywords = jobKeywords(`${jobTitle} ${jobDescriptionText}`);
    const selectedWork = pickBest(workExperience, (e) => `${e.title} ${e.company} ${e.bullets.join(" ")}`, keywords, 2);
    const selectedProjects = pickBest(projects, (p) => `${p.name} ${p.technologies.join(" ")} ${p.bullets.join(" ")}`, keywords, 2);

    const experienceSection = selectedWork.length > 0
      ? `WORK EXPERIENCE\n${formatExperience(selectedWork)}`
      : "";

    const projectsSection = selectedProjects.length > 0
      ? `PROJECTS\n${formatProjects(selectedProjects)}`
      : "";

    const skillsSection = [...skills, ...stacks].length > 0
      ? `SKILLS: ${[...skills, ...stacks].join(", ")}`
      : "";

    const educationSection = educationEntries.length > 0
      ? `EDUCATION\n${educationEntries.map((e) => `• ${e}`).join("\n")}`
      : "";

    const fallbackNote = !hasStructuredData && hasResume
      ? `\nRAW RESUME (use this to extract experience if structured sections are empty):\n${resumeText.slice(0, 2500)}`
      : "";

    const linksSection = profileLinks.length > 0
      ? `Links: ${profileLinks.map((l) => `${l.label}: ${l.url}`).join(" | ")}`
      : "";

    const prompt = `You are an expert ATS resume writer and career coach. Generate the best possible ATS-optimized resume for this specific job.

JOB TARGET: ${jobTitle} at ${jobCompany}

JOB DESCRIPTION:
${jobDescriptionText.slice(0, 2000)}

CANDIDATE PROFILE:
Name: ${name || "Candidate"}
${linksSection}
${skillsSection}

${experienceSection}

${projectsSection}

${educationSection}
${fallbackNote}

YOUR TASKS:
1. Extract the top 20 ATS keywords/skills from the job description (technical skills, tools, methodologies, certifications, soft skills)
2. Identify which keywords the candidate already covers (matchedKeywords)
3. Identify which are missing (missingKeywords)
4. Calculate score 0-100 based on keyword coverage
5. Evaluate the overall quality of the candidate's fit for this specific role:
   - "Excellent": Experience strongly aligns — candidate is highly competitive
   - "Good": Candidate meets most key requirements with minor gaps
   - "Fair": Some relevant experience but notable gaps in required skills or seniority
   - "Poor": Experience does not sufficiently match this role's core requirements
6. Write qualityFeedback: 2 sentences — state the rating reason and one specific thing that would strengthen the resume for this role
7. Generate a complete, ATS-optimized resume using this format:

--- RESUME FORMAT (plain text, NO tables, NO columns, NO special characters) ---
[FULL NAME]
[Email] | [Phone] | [Location]${profileLinks.length > 0 ? ` | ${profileLinks.map((l) => `${l.label}: ${l.url}`).join(" | ")}` : ""}

PROFESSIONAL SUMMARY
[2-3 sentences using job-relevant keywords, highlighting strongest match to this role]

CORE SKILLS
[comma-separated list of skills optimized for this job's ATS keywords — include matched AND relevant missing ones the candidate can honestly claim]

WORK EXPERIENCE
[Company] | [Title] | [Location] | [Start] – [End]
• [Action verb + accomplishment + result/metric — work in relevant keywords naturally]
• [Another bullet]

PROJECTS
[Project Name] | [Technologies]
• [What it does, impact, technologies used]

EDUCATION
[Degree, Institution, Year]
---

RULES:
- Use ONLY the candidate's real experience — do not fabricate jobs, titles, or skills
- Naturally work in missing keywords where they genuinely fit the candidate's background
- Use strong action verbs: Engineered, Built, Designed, Optimized, Led, Delivered, Implemented
- Add metrics and numbers where the experience implies them (e.g. "team of N", "reduced by X%")
- Keep bullets concise and impactful — one strong bullet beats three weak ones
- If structured experience is empty, extract and restructure from the raw resume

Return JSON:
{
  "score": <number 0-100>,
  "matchedKeywords": ["keyword", ...],
  "missingKeywords": ["keyword", ...],
  "qualityRating": "Excellent or Good or Fair or Poor",
  "qualityFeedback": "<2 sentences on rating and what would strengthen the resume>",
  "optimizedResume": "<complete ATS resume as plain text>"
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an expert ATS resume writer. Output only the raw JSON object — no markdown, no code fences, no explanation." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 6000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }
    const parsed = parseJsonSafe(raw.slice(start, end + 1)) as Record<string, unknown>;

    const validRatings: QualityRating[] = ["Excellent", "Good", "Fair", "Poor"];
    const rawRating = typeof parsed.qualityRating === "string" ? parsed.qualityRating.trim() : "";
    const qualityRating: QualityRating = validRatings.includes(rawRating as QualityRating)
      ? (rawRating as QualityRating)
      : "Fair";

    return {
      ok: true,
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, Math.round(parsed.score))) : 0,
      matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords.map(String) : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.map(String) : [],
      qualityRating,
      qualityFeedback: typeof parsed.qualityFeedback === "string" ? parsed.qualityFeedback.trim() : "",
      optimizedResume: typeof parsed.optimizedResume === "string" ? parsed.optimizedResume.trim() : "",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("quota")) {
      return { ok: false, error: "AI is temporarily rate-limited. Wait a moment and try again." };
    }
    if (message.includes("API key") || message.includes("auth")) {
      return { ok: false, error: "Groq API key is missing or invalid. Add GROQ_API_KEY to your environment variables." };
    }
    return { ok: false, error: `Resume generation failed: ${message}` };
  }
}
