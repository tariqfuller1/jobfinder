import { inferEmploymentType, inferExperienceLevel, parseTags, stripHtml } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

const RSS_FEEDS = [
  "https://weworkremotely.com/remote-jobs.rss",
];

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function getXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"),
  );
  return match ? decodeEntities(match[1].trim()) : null;
}

function parseTitle(raw: string): { company: string; jobTitle: string } {
  const colonIdx = raw.indexOf(": ");
  if (colonIdx !== -1) {
    return { company: raw.slice(0, colonIdx).trim(), jobTitle: raw.slice(colonIdx + 2).trim() };
  }
  return { company: "Unknown", jobTitle: raw };
}

export async function fetchWeWorkRemotelyJobs(): Promise<NormalizedJob[]> {
  const seenIds = new Set<string>();
  const allJobs: NormalizedJob[] = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent": "JobFinder/1.0",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        cache: "no-store",
      });
      if (!response.ok) continue;

      const xml = await response.text();
      const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

      for (const [, itemXml] of itemMatches) {
        const rawTitle = getXmlTag(itemXml, "title");
        const guid = getXmlTag(itemXml, "guid");
        const link = guid || getXmlTag(itemXml, "link");
        const description = getXmlTag(itemXml, "description");
        const pubDate = getXmlTag(itemXml, "pubDate");
        const region = getXmlTag(itemXml, "region");

        if (!rawTitle || !link) continue;
        const id = guid || link;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const { company, jobTitle } = parseTitle(rawTitle);
        const descText = description ? stripHtml(description) : null;
        const location =
          region && !/worldwide|anywhere/i.test(region) ? region.trim() : null;

        allJobs.push({
          externalId: id,
          source: "weworkremotely",
          sourceUrl: link,
          applyUrl: link,
          title: jobTitle,
          company,
          location,
          workplaceType: "REMOTE",
          employmentType: inferEmploymentType(`${jobTitle} ${descText ?? ""}`),
          experienceLevel: inferExperienceLevel(jobTitle),
          descriptionHtml: description ?? null,
          descriptionText: descText,
          postedAt: pubDate ? new Date(pubDate) : null,
          tags: parseTags(region ?? "remote", "remote"),
        } satisfies NormalizedJob);
      }
    } catch {
      // If one feed fails, continue with the others
    }
  }

  return allJobs;
}
