import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type ArbeitnowJob = {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
};

type ArbeitnowResponse = {
  data?: ArbeitnowJob[];
  links?: {
    next?: string | null;
  };
  meta?: {
    current_page?: number;
    last_page?: number;
  };
};

const DEFAULT_API_URL = "https://www.arbeitnow.com/api/job-board-api";

function normalizePageDate(value?: number) {
  if (typeof value !== "number") return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function fetchArbeitnowJobs(
  apiUrl = process.env.ARBEITNOW_API_URL || DEFAULT_API_URL,
  maxPages = Number(process.env.ARBEITNOW_MAX_PAGES || 6),
): Promise<NormalizedJob[]> {
  const jobs: NormalizedJob[] = [];
  const visitedPages = new Set<string>();
  let page = 1;
  let nextUrl: string | null = apiUrl;

  while (nextUrl && page <= Math.max(1, maxPages)) {
    const requestUrl = nextUrl.includes("?") ? `${nextUrl}&page=${page}` : `${nextUrl}?page=${page}`;
    if (visitedPages.has(requestUrl)) break;
    visitedPages.add(requestUrl);

    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobFinder/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Arbeitnow fetch failed on page ${page}: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as ArbeitnowResponse;
    const rows = payload.data ?? [];
    if (!rows.length) break;

    for (const row of rows) {
      if (!row.title || !row.url) continue;
      const tags = [...(row.tags ?? []), ...(row.job_types ?? [])].filter(Boolean);
      const searchableText = [row.title, row.description ?? "", row.location ?? "", ...tags].join(" ");

      jobs.push({
        externalId: row.slug || row.url,
        source: "arbeitnow",
        sourceUrl: row.url,
        applyUrl: row.url,
        title: row.title,
        company: row.company_name || "Unknown Company",
        location: row.location ?? null,
        workplaceType: inferWorkplaceType(`${row.remote ? "remote" : ""} ${row.location ?? ""}`),
        employmentType: inferEmploymentType((row.job_types ?? []).join(" ")),
        experienceLevel: inferExperienceLevel(searchableText),
        descriptionHtml: row.description ?? null,
        descriptionText: row.description ?? null,
        postedAt: normalizePageDate(row.created_at),
        tags: parseTags(...tags),
      } satisfies NormalizedJob);
    }

    const lastPage = payload.meta?.last_page;
    if (typeof lastPage === "number" && page >= lastPage) break;
    if (!payload.links?.next && rows.length === 0) break;
    page += 1;
    nextUrl = apiUrl;
  }

  const deduped = new Map<string, NormalizedJob>();
  for (const job of jobs) {
    const key = `${job.title.toLowerCase()}::${job.company.toLowerCase()}::${job.applyUrl}`;
    if (!deduped.has(key)) deduped.set(key, job);
  }

  return [...deduped.values()];
}
