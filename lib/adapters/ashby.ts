import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type AshbyResponse = {
  jobs?: Array<{
    id?: string;
    title: string;
    location?: string;
    secondaryLocations?: Array<{ location?: string }>;
    department?: string;
    team?: string;
    isRemote?: boolean;
    workplaceType?: string;
    descriptionHtml?: string;
    descriptionPlain?: string;
    publishedAt?: string;
    employmentType?: string;
    jobUrl?: string;
    applyUrl?: string;
  }>;
};

export async function fetchAshbyJobs(jobBoardName: string): Promise<NormalizedJob[]> {
  const response = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(jobBoardName)}?includeCompensation=true`,
    {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 },
    },
  );

  if (!response.ok) {
    throw new Error(`Ashby fetch failed for ${jobBoardName}: ${response.status}`);
  }

  const data = (await response.json()) as AshbyResponse;
  const jobs = data.jobs ?? [];

  return jobs.map((job, index) => {
    const location = [job.location, ...(job.secondaryLocations?.map((item) => item.location ?? "") ?? [])]
      .filter(Boolean)
      .join(", ");
    const workplaceHint = `${job.workplaceType ?? ""} ${job.isRemote ? "remote" : ""} ${location}`;

    return {
      externalId: job.id ?? `${jobBoardName}-${index}-${job.title}`,
      source: "ashby",
      sourceUrl: job.jobUrl ?? job.applyUrl ?? `https://jobs.ashbyhq.com/${jobBoardName}`,
      applyUrl: job.applyUrl ?? job.jobUrl ?? `https://jobs.ashbyhq.com/${jobBoardName}`,
      title: job.title,
      company: jobBoardName,
      location: location || null,
      workplaceType: inferWorkplaceType(workplaceHint),
      employmentType: inferEmploymentType(job.employmentType),
      experienceLevel: inferExperienceLevel(`${job.title} ${job.department ?? ""} ${job.team ?? ""}`),
      descriptionHtml: job.descriptionHtml ?? null,
      descriptionText: job.descriptionPlain ?? null,
      postedAt: job.publishedAt ? new Date(job.publishedAt) : null,
      tags: parseTags(job.department, job.team, job.employmentType, job.workplaceType, location),
    } satisfies NormalizedJob;
  });
}
