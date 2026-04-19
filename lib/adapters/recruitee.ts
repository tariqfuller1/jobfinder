import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type RecruiteeResponse = {
  offers?: Array<{
    id?: number;
    title: string;
    careers_url?: string;
    location?: string;
    remote?: boolean;
    department?: { name?: string };
    description?: string;
    employment_type?: string;
    created_at?: string;
  }>;
};

export async function fetchRecruiteeJobs(company: string): Promise<NormalizedJob[]> {
  const url = `https://${encodeURIComponent(company)}.recruitee.com/api/offers/`;
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Recruitee fetch failed for ${company}: ${response.status}`);
  }

  const data = (await response.json()) as RecruiteeResponse;
  const offers = data.offers ?? [];

  return offers.map((job, index) => ({
    externalId: String(job.id ?? `${company}-${index}-${job.title}`),
    source: "recruitee",
    sourceUrl: job.careers_url ?? `https://${company}.recruitee.com/`,
    applyUrl: job.careers_url ?? `https://${company}.recruitee.com/`,
    title: job.title,
    company,
    location: job.location ?? null,
    workplaceType: inferWorkplaceType(`${job.remote ? "remote" : ""} ${job.location ?? ""}`),
    employmentType: inferEmploymentType(job.employment_type),
    experienceLevel: inferExperienceLevel(`${job.title} ${job.department?.name ?? ""}`),
    descriptionHtml: job.description ?? null,
    descriptionText: job.description ?? null,
    postedAt: job.created_at ? new Date(job.created_at) : null,
    tags: parseTags(job.department?.name, job.employment_type, job.location ?? ""),
  } satisfies NormalizedJob));
}
