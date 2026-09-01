import { inferEmploymentType, inferExperienceLevel, parseTags, stripHtml } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

const BASE_URL = "https://himalayas.app/jobs/api";
const PAGE_SIZE = 20;

type HimalayasJob = {
  guid: string;
  title: string;
  companyName: string;
  employmentType: string;
  seniority: string[];
  locationRestrictions: string[];
  categories: string[];
  parentCategories: string[];
  description: string;
  pubDate: number;
  applicationLink: string;
};

type HimalayasResponse = {
  jobs: HimalayasJob[];
  nextCursor?: string;
};

export async function fetchHimalayasJobs(): Promise<NormalizedJob[]> {
  const maxPages = parseInt(process.env.HIMALAYAS_MAX_PAGES ?? "5", 10);
  const allJobs: NormalizedJob[] = [];
  // Himalayas deprecated offset-based paging in favor of cursor-based paging
  // (per the API's own response notice) — cursor is faster and never repeats
  // a job across pages.
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(BASE_URL);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "JobFinder/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      if (page === 0) throw new Error(`Himalayas fetch failed: ${response.status}`);
      break;
    }

    const data = (await response.json()) as HimalayasResponse;
    const jobs = data.jobs ?? [];
    if (!jobs.length) break;

    for (const job of jobs) {
      const applyUrl = job.applicationLink?.trim();
      // Skip jobs that have no apply link or just point at the generic jobs listing
      if (!applyUrl || applyUrl === "https://himalayas.app/jobs" || applyUrl === "https://himalayas.app") continue;

      const locationRestrictions = job.locationRestrictions ?? [];
      const location =
        locationRestrictions.length === 0 || locationRestrictions.length > 3
          ? null
          : locationRestrictions.join(", ");

      const seniorityStr = (job.seniority ?? []).join(" ");
      const sourceUrl = `https://himalayas.app/jobs/${job.guid}`;

      allJobs.push({
        externalId: job.guid,
        source: "himalayas",
        sourceUrl,
        applyUrl,
        title: job.title,
        company: job.companyName,
        location,
        workplaceType: "REMOTE",
        employmentType: inferEmploymentType(job.employmentType),
        experienceLevel: inferExperienceLevel(`${job.title} ${seniorityStr}`),
        descriptionHtml: job.description ?? null,
        descriptionText: stripHtml(job.description),
        postedAt: job.pubDate ? new Date(job.pubDate * 1000) : null,
        tags: parseTags(...(job.categories ?? []), ...(job.parentCategories ?? [])),
      } satisfies NormalizedJob);
    }

    if (!data.nextCursor || jobs.length < PAGE_SIZE) break;
    cursor = data.nextCursor;
  }

  return allJobs;
}
