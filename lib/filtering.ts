import type { NormalizedJob } from "@/types/jobs";

const DEFAULT_SOFTWARE_KEYWORDS = [
  "software engineer",
  "software developer",
  "full stack",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "web developer",
  "mobile engineer",
  "ios",
  "android",
  "unity",
  "gameplay programmer",
  "game programmer",
  "engine programmer",
  "graphics programmer",
  "tools engineer",
  "qa automation",
  "devops",
  "site reliability",
  "sre",
  "platform engineer",
  "application engineer",
  "machine learning engineer",
  "ml engineer",
  "data engineer",
  "embedded software",
  "firmware",
  "test engineer",
  "build engineer",
  "python developer",
  "javascript engineer",
  "typescript engineer",
  "c++",
  "c#",
  "java developer",
  "react",
  "node",
  "intern software",
  "software internship",
  "new grad",
  "graduate software",
  "associate engineer",
  "junior engineer",
];

export function getSoftwareJobKeywords(): string[] {
  const raw = process.env.SOFTWARE_JOB_KEYWORDS?.trim();
  if (!raw) return DEFAULT_SOFTWARE_KEYWORDS;

  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isSoftwareJob(job: Pick<NormalizedJob, "title" | "descriptionText" | "descriptionHtml" | "tags">): boolean {
  const haystack = [job.title, job.descriptionText ?? "", job.descriptionHtml ?? "", ...(job.tags ?? [])]
    .join(" ")
    .toLowerCase();

  return getSoftwareJobKeywords().some((keyword) => haystack.includes(keyword));
}

export function filterSoftwareJobs<T extends NormalizedJob>(jobs: T[]): T[] {
  return jobs.filter(isSoftwareJob);
}

export function parseCsvEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
