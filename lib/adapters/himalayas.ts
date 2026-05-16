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
  totalCount: number;
  limit: number;
  offset: number;
};

export async function fetchHimalayasJobs(): Promise<NormalizedJob[]> {
  const maxPages = parseInt(process.env.HIMALAYAS_MAX_PAGES ?? "50", 10);
  const allJobs: NormalizedJob[] = [];

  for (let page = 0; page < maxPages; page++) {
    const url = `${BASE_URL}?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`;
    const response = await fetch(url, {
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
      const locationRestrictions = job.locationRestrictions ?? [];
      const location =
        locationRestrictions.length === 0 || locationRestrictions.length > 3
          ? null
          : locationRestrictions.join(", ");

      const seniorityStr = (job.seniority ?? []).join(" ");

      allJobs.push({
        externalId: job.guid,
        source: "himalayas",
        sourceUrl: job.guid,
        applyUrl: job.applicationLink,
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

    if ((page + 1) * PAGE_SIZE >= data.totalCount) break;
  }

  return allJobs;
}
