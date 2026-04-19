import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  descriptionPlain?: string;
  description?: string;
  workplaceType?: string;
  categories?: {
    commitment?: string;
    location?: string;
    team?: string;
    level?: string;
    allLocations?: string[];
  };
  createdAt?: number;
};

export async function fetchLeverJobs(companyToken: string): Promise<NormalizedJob[]> {
  const response = await fetch(`https://api.lever.co/v0/postings/${companyToken}?mode=json`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Lever fetch failed for ${companyToken}: ${response.status}`);
  }

  const data = (await response.json()) as LeverPosting[];

  return data.map((job) => {
    const location = job.categories?.location ?? job.categories?.allLocations?.join(", ") ?? null;
    return {
      externalId: job.id,
      source: "lever",
      sourceUrl: job.hostedUrl,
      applyUrl: job.applyUrl ?? job.hostedUrl,
      title: job.text,
      company: companyToken,
      location,
      workplaceType: inferWorkplaceType(`${job.workplaceType ?? ""} ${location ?? ""}`),
      employmentType: inferEmploymentType(job.categories?.commitment),
      experienceLevel: inferExperienceLevel(`${job.text} ${job.categories?.level ?? ""}`),
      descriptionHtml: job.description ?? null,
      descriptionText: job.descriptionPlain ?? null,
      postedAt: typeof job.createdAt === "number" ? new Date(job.createdAt) : null,
      tags: parseTags(job.categories?.team, job.categories?.level, job.categories?.commitment),
    } satisfies NormalizedJob;
  });
}
