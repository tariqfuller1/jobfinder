import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

const RSS_URL = "https://workwithindies.com/careers/rss.xml";

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
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1].trim()) : null;
}

function parseTitle(raw: string): { company: string; jobTitle: string; location: string | null } {
  // "Company Name is hiring a Job Title to work from Location"
  const full = raw.match(/^(.+?)\s+is hiring (?:a |an )?(.+?)\s+to work from\s+(.+)$/i);
  if (full) return { company: full[1].trim(), jobTitle: full[2].trim(), location: full[3].trim() };
  const partial = raw.match(/^(.+?)\s+is hiring (?:a |an )?(.+)$/i);
  if (partial) return { company: partial[1].trim(), jobTitle: partial[2].trim(), location: null };
  return { company: "Unknown", jobTitle: raw, location: null };
}

function extractTags(description: string): string[] {
  // Description ends with: "Tags: [Category] [Employment Type]"
  const m = description.match(/Tags:\s*((?:\[[^\]]+\]\s*)+)$/i);
  if (!m) return [];
  return [...m[1].matchAll(/\[([^\]]+)\]/g)].map((x) => x[1].trim());
}

export async function fetchWorkWithIndiesJobs(): Promise<NormalizedJob[]> {
  const response = await fetch(RSS_URL, {
    headers: { "User-Agent": "JobFinder/1.0", Accept: "application/rss+xml, application/xml, text/xml" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Work With Indies RSS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  const jobs: NormalizedJob[] = [];

  for (const [, itemXml] of itemMatches) {
    const rawTitle = getXmlTag(itemXml, "title");
    const link = getXmlTag(itemXml, "link");
    const guid = getXmlTag(itemXml, "guid");
    const description = getXmlTag(itemXml, "description");
    const pubDate = getXmlTag(itemXml, "pubDate");

    if (!rawTitle || !link) continue;

    const { company, jobTitle, location } = parseTitle(rawTitle);
    const tags = description ? extractTags(description) : [];
    const descText = description
      ? description.replace(/\s*Tags:\s*(?:\[[^\]]+\]\s*)+$/, "").trim() || null
      : null;

    const isAnywhere = !location || /^anywhere$/i.test(location.trim());
    const locationStr = isAnywhere ? null : location;
    const workplaceHint = isAnywhere ? "remote" : `${locationStr ?? ""} ${tags.join(" ")}`;

    jobs.push({
      externalId: guid || link,
      source: "workwithindies",
      sourceUrl: link,
      applyUrl: link,
      title: jobTitle,
      company,
      location: locationStr,
      workplaceType: inferWorkplaceType(workplaceHint),
      employmentType: inferEmploymentType(tags.join(" ")),
      experienceLevel: inferExperienceLevel(jobTitle),
      descriptionHtml: null,
      descriptionText: descText,
      postedAt: pubDate ? new Date(pubDate) : null,
      tags: parseTags(...tags),
    } satisfies NormalizedJob);
  }

  return jobs;
}
