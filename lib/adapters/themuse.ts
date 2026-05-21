import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags, stripHtml } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

const BASE_URL = "https://www.themuse.com/api/public/jobs";
const TECH_CATEGORIES = ["Engineering", "Data Science", "IT"];

type MuseJob = {
  id: number;
  name: string;
  company: { id: number; name: string };
  locations: Array<{ name: string }>;
  levels: Array<{ short_name: string; name: string }>;
  categories: Array<{ name: string }>;
  contents: string;
  refs: { landing_page: string };
  publication_date: string;
};

type MuseResponse = {
  results: MuseJob[];
  page: number;
  page_count: number;
};

export async function fetchTheMuseJobs(): Promise<NormalizedJob[]> {
  const maxPages = parseInt(process.env.THEMUSE_MAX_PAGES ?? "3", 10);
  const seenIds = new Set<number>();
  const allJobs: NormalizedJob[] = [];

  for (const category of TECH_CATEGORIES) {
    for (let page = 0; page < maxPages; page++) {
      const url = `${BASE_URL}?category=${encodeURIComponent(category)}&page=${page}&descending=true`;
      const response = await fetch(url, {
        headers: { "User-Agent": "JobFinder/1.0", Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) break;

      const data = (await response.json()) as MuseResponse;
      const jobs = data.results ?? [];
      if (!jobs.length) break;

      for (const job of jobs) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);

        const location = job.locations?.[0]?.name ?? null;
        const level = (job.levels ?? []).map((l) => l.name).join(" ");
        const categories = (job.categories ?? []).map((c) => c.name);

        allJobs.push({
          externalId: `themuse-${job.id}`,
          source: "themuse",
          sourceUrl: job.refs.landing_page,
          applyUrl: job.refs.landing_page,
          title: job.name,
          company: job.company.name,
          location,
          workplaceType: inferWorkplaceType(`${location ?? ""} ${job.contents ?? ""}`),
          employmentType: inferEmploymentType(`${job.name} ${level}`),
          experienceLevel: inferExperienceLevel(`${job.name} ${level}`),
          descriptionHtml: job.contents ?? null,
          descriptionText: stripHtml(job.contents),
          postedAt: job.publication_date ? new Date(job.publication_date) : null,
          tags: parseTags(...categories),
        } satisfies NormalizedJob);
      }

      if (page + 1 >= data.page_count) break;
    }
  }

  return allJobs;
}
