import { inferEmploymentType, inferExperienceLevel, parseTags, stripHtml } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type RemoteOKJob = {
  id: string | number;
  url: string;
  apply_url?: string;
  company: string;
  position: string;
  tags?: string[];
  description?: string;
  date?: string;
  location?: string;
};

export async function fetchRemoteOKJobs(): Promise<NormalizedJob[]> {
  const response = await fetch("https://remoteok.com/api", {
    headers: {
      "User-Agent": "JobFinder/1.0 (job aggregator)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RemoteOK fetch failed: ${response.status}`);
  }

  const raw = (await response.json()) as Array<RemoteOKJob | Record<string, unknown>>;
  // First element is a legal/metadata object — skip it
  const items = raw.slice(1) as RemoteOKJob[];

  return items
    .filter((job) => job.position && job.company)
    .map((job) => {
      const tags = job.tags ?? [];
      const location =
        job.location && !/worldwide|anywhere/i.test(job.location) ? job.location : null;
      return {
        externalId: String(job.id),
        source: "remoteok",
        sourceUrl: job.url,
        applyUrl: job.apply_url || job.url,
        title: job.position,
        company: job.company,
        location,
        workplaceType: "REMOTE" as const,
        employmentType: inferEmploymentType(tags.join(" ")),
        experienceLevel: inferExperienceLevel(`${job.position} ${tags.join(" ")}`),
        descriptionHtml: job.description ?? null,
        descriptionText: stripHtml(job.description),
        postedAt: job.date ? new Date(job.date) : null,
        tags: parseTags(...tags),
      } satisfies NormalizedJob;
    });
}
