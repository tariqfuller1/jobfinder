import type { NormalizedJob } from "@/types/jobs";

// Title-level keywords used in two places:
// 1. isSoftwareJob — gates which jobs enter the DB during sync
// 2. listJobs WHERE clause — filters out bad data already in the DB at query time
// Matching is against job title only (not description) so "window installer" with
// "software" in its description body doesn't sneak through.
export const TECH_JOB_TITLE_KEYWORDS: string[] = [
  // Software engineering
  "software engineer", "software developer", "software architect",
  "frontend engineer", "frontend developer", "front-end engineer", "front-end developer",
  "backend engineer", "backend developer", "back-end engineer", "back-end developer",
  "full stack", "fullstack",
  "web developer", "web engineer",
  "application developer", "application engineer",
  "platform engineer",
  "site reliability engineer",
  "devops engineer",
  "cloud engineer", "cloud developer",
  "infrastructure engineer",
  // Mobile
  "mobile engineer", "mobile developer",
  "ios engineer", "ios developer",
  "android engineer", "android developer",
  "react native developer", "flutter developer",
  // Data / ML / AI
  "data engineer", "data scientist", "data analyst", "analytics engineer",
  "machine learning engineer", "ml engineer",
  "ai engineer",
  "research engineer", "applied scientist",
  "bi engineer", "business intelligence engineer",
  // Game development
  "game programmer", "gameplay programmer",
  "engine programmer", "graphics programmer", "rendering engineer",
  "tools programmer", "tools engineer",
  "game engineer", "game developer",
  "unity developer", "unity engineer",
  "unreal developer", "unreal engineer",
  "technical artist",
  "game designer", "level designer", "narrative designer", "systems designer",
  "technical designer",
  "vfx artist",
  // Embedded / hardware
  "embedded software", "embedded engineer", "embedded developer",
  "firmware engineer", "firmware developer",
  // QA / testing
  "qa engineer", "qa automation engineer",
  "test engineer", "test automation engineer",
  "sdet",
  "quality assurance engineer",
  // Other technical
  "build engineer", "release engineer",
  "security engineer", "security researcher",
  // Language / framework specific titles
  "python developer", "python engineer",
  "javascript developer", "javascript engineer",
  "typescript developer", "typescript engineer",
  "java developer", "java engineer",
  "golang developer", "go developer",
  "rust developer", "rust engineer",
  "c++ developer", "c++ engineer", "c++ programmer",
  "c# developer", "c# engineer",
  ".net developer", ".net engineer",
  "react developer",
  "node developer",
  // Entry-level / junior variants
  "associate developer", "associate engineer",
  "junior developer", "junior engineer", "junior software",
  "software intern", "engineering intern", "software internship",
  "new grad software", "new graduate engineer",
];

const DEFAULT_SOFTWARE_KEYWORDS = TECH_JOB_TITLE_KEYWORDS;

export function getSoftwareJobKeywords(): string[] {
  const raw = process.env.SOFTWARE_JOB_KEYWORDS?.trim();
  if (!raw) return DEFAULT_SOFTWARE_KEYWORDS;

  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

// Matches against title and tags ONLY — deliberately excludes description text
// so that jobs like "Window Installer" don't pass just because their description
// mentions "software tools" or "react to customer requests".
export function isSoftwareJob(job: Pick<NormalizedJob, "title" | "tags">): boolean {
  const haystack = [job.title, ...(job.tags ?? [])].join(" ").toLowerCase();
  return getSoftwareJobKeywords().some((keyword) => haystack.includes(keyword));
}

export function filterSoftwareJobs<T extends Pick<NormalizedJob, "title" | "tags">>(jobs: T[]): T[] {
  return jobs.filter(isSoftwareJob);
}

export function parseCsvEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
