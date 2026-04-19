import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type RemotiveResponse = {
  jobs?: Array<{
    id: number;
    title: string;
    company_name: string;
    category?: string;
    candidate_required_location?: string;
    publication_date?: string;
    job_type?: string;
    url: string;
    description?: string;
    tags?: string[];
  }>;
};

export async function fetchRemotiveJobs(): Promise<NormalizedJob[]> {
  const response = await fetch("https://remotive.com/api/remote-jobs?category=software-dev", {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Remotive fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as RemotiveResponse;
  const jobs = data.jobs ?? [];

  return jobs.map((job) => ({
    externalId: String(job.id),
    source: "remotive",
    sourceUrl: job.url,
    applyUrl: job.url,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location ?? null,
    workplaceType: inferWorkplaceType(`remote ${job.candidate_required_location ?? ""}`),
    employmentType: inferEmploymentType(job.job_type),
    experienceLevel: inferExperienceLevel(`${job.title} ${(job.tags ?? []).join(" ")}`),
    descriptionHtml: job.description ?? null,
    descriptionText: job.description ?? null,
    postedAt: job.publication_date ? new Date(job.publication_date) : null,
    tags: parseTags(job.category, job.job_type, ...(job.tags ?? [])),
  } satisfies NormalizedJob));
}
