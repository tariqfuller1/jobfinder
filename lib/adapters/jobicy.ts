import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags, stripHtml } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

const BASE_URL = "https://jobicy.com/api/v2/remote-jobs";

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobIndustry?: string[];
  jobType?: string;
  jobGeo?: string;
  jobLevel?: string;
  jobDescription?: string;
  pubDate?: string;
};

type JobicyResponse = {
  jobs?: JobicyJob[];
};

export async function fetchJobicyJobs(): Promise<NormalizedJob[]> {
  const response = await fetch(`${BASE_URL}?count=50&industry=engineering`, {
    headers: { "User-Agent": "JobFinder/1.0", Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Jobicy fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as JobicyResponse;
  const jobs = data.jobs ?? [];

  return jobs.map((job) => {
    const location =
      job.jobGeo && !/worldwide|anywhere/i.test(job.jobGeo) ? job.jobGeo : null;
    return {
      externalId: String(job.id),
      source: "jobicy",
      sourceUrl: job.url,
      applyUrl: job.url,
      title: job.jobTitle,
      company: job.companyName,
      location,
      workplaceType: inferWorkplaceType(`remote ${job.jobGeo ?? ""}`),
      employmentType: inferEmploymentType(job.jobType ?? ""),
      experienceLevel: inferExperienceLevel(`${job.jobTitle} ${job.jobLevel ?? ""}`),
      descriptionHtml: job.jobDescription ?? null,
      descriptionText: stripHtml(job.jobDescription),
      postedAt: job.pubDate ? new Date(job.pubDate) : null,
      tags: parseTags(...(job.jobIndustry ?? []), job.jobType ?? ""),
    } satisfies NormalizedJob;
  });
}
