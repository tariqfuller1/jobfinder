import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type WorkableResponse = {
  jobs?: Array<{
    id?: string | number;
    title: string;
    shortcode?: string;
    url?: string;
    application_url?: string;
    description?: string;
    description_plain?: string;
    employment_type?: string;
    department?: string;
    code?: string;
    created_at?: string;
    updated_at?: string;
    location?: {
      location_str?: string;
      workplace_type?: string;
      telecommuting?: boolean;
      city?: string;
      region?: string;
      country?: string;
    };
  }>;
};

export async function fetchWorkableJobs(account: string): Promise<NormalizedJob[]> {
  const response = await fetch(`https://www.workable.com/api/accounts/${encodeURIComponent(account)}?details=true`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Workable fetch failed for ${account}: ${response.status}`);
  }

  const data = (await response.json()) as WorkableResponse;
  const jobs = data.jobs ?? [];

  return jobs.map((job, index) => {
    const location =
      job.location?.location_str ||
      [job.location?.city, job.location?.region, job.location?.country].filter(Boolean).join(", ") ||
      null;

    return {
      externalId: String(job.id ?? job.shortcode ?? `${account}-${index}-${job.title}`),
      source: "workable",
      sourceUrl: job.url ?? job.application_url ?? `https://apply.workable.com/${account}/`,
      applyUrl: job.application_url ?? job.url ?? `https://apply.workable.com/${account}/`,
      title: job.title,
      company: account,
      location,
      workplaceType: inferWorkplaceType(
        `${job.location?.workplace_type ?? ""} ${job.location?.telecommuting ? "remote" : ""} ${location ?? ""}`,
      ),
      employmentType: inferEmploymentType(job.employment_type),
      experienceLevel: inferExperienceLevel(`${job.title} ${job.code ?? ""} ${job.department ?? ""}`),
      descriptionHtml: job.description ?? null,
      descriptionText: job.description_plain ?? null,
      postedAt: job.updated_at ? new Date(job.updated_at) : job.created_at ? new Date(job.created_at) : null,
      tags: parseTags(job.department, job.employment_type, job.location?.workplace_type, location ?? ""),
    } satisfies NormalizedJob;
  });
}
