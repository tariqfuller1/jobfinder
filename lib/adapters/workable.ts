import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type WorkableJob = {
  id?: string;
  shortcode?: string;
  title: string;
  url?: string;
  application_url?: string;
  description?: string;
  description_plain?: string;
  employment_type?: string;
  department?: { title?: string } | string;
  code?: string;
  created_at?: string;
  location?: {
    location_str?: string;
    workplace_type?: string;
    telecommuting?: boolean;
    city?: string;
    region?: string;
    country?: string;
  };
};

// Workable has two public API formats depending on the endpoint:
// v3 (apply.workable.com) returns { results: [...] }
// legacy (www.workable.com) returns { jobs: [...] }
type WorkableResponse = {
  results?: WorkableJob[];
  jobs?: WorkableJob[];
};

export async function fetchWorkableJobs(account: string): Promise<NormalizedJob[]> {
  // Try the current v3 API first; fall back to the legacy endpoint if it fails.
  const urls = [
    `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(account)}/jobs`,
    `https://www.workable.com/api/accounts/${encodeURIComponent(account)}?details=true`,
  ];

  let lastError = "";
  for (const url of urls) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      lastError = `${response.status} ${response.statusText} (${url})`;
      continue;
    }

    const data = (await response.json()) as WorkableResponse;
    const jobs: WorkableJob[] = data.results ?? data.jobs ?? [];

    return jobs.map((job, index) => {
      const deptName = typeof job.department === "object" ? job.department?.title : job.department;
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
        experienceLevel: inferExperienceLevel(`${job.title} ${job.code ?? ""} ${deptName ?? ""}`),
        descriptionHtml: job.description ?? null,
        descriptionText: job.description_plain ?? null,
        postedAt: job.created_at ? new Date(job.created_at) : null,
        tags: parseTags(deptName, job.employment_type, job.location?.workplace_type, location ?? ""),
      } satisfies NormalizedJob;
    });
  }

  throw new Error(`Workable fetch failed for ${account}: ${lastError}`);
}
