import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

const BASE_URL = "https://boards-api.greenhouse.io/v1/boards";

type GreenhouseResponse = {
  jobs: Array<{
    id: number;
    title: string;
    location?: { name?: string };
    absolute_url: string;
    updated_at?: string;
    metadata?: Array<{ name: string; value: string }>;
    departments?: Array<{ name: string }>;
    offices?: Array<{ name: string }>;
    internal_job_id?: number;
  }>;
};

export async function fetchGreenhouseJobs(companyToken: string): Promise<NormalizedJob[]> {
  const response = await fetch(`${BASE_URL}/${companyToken}/jobs?content=true`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Greenhouse fetch failed for ${companyToken}: ${response.status}`);
  }

  const data = (await response.json()) as GreenhouseResponse;

  return data.jobs.map((job) => {
    const metadataText = job.metadata?.map((item) => `${item.name}: ${item.value}`).join(" | ") ?? "";
    const workplace = inferWorkplaceType(`${job.location?.name ?? ""} ${metadataText}`);
    const employment = inferEmploymentType(metadataText);
    const experience = inferExperienceLevel(`${job.title} ${metadataText}`);

    return {
      externalId: `${job.id}`,
      source: "greenhouse",
      sourceUrl: job.absolute_url,
      applyUrl: job.absolute_url,
      title: job.title,
      company: companyToken,
      location: job.location?.name ?? null,
      workplaceType: workplace,
      employmentType: employment,
      experienceLevel: experience,
      descriptionHtml: null,
      descriptionText: null,
      postedAt: null,
      tags: parseTags(job.departments?.map((d) => d.name).join(", "), job.offices?.map((o) => o.name).join(", "), metadataText),
    } satisfies NormalizedJob;
  });
}
