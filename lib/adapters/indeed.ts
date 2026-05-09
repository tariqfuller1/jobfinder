import { load } from "cheerio";
import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

// Default tech-focused queries. Override via INDEED_SEARCH_QUERIES="q1,q2,..."
const DEFAULT_QUERIES = [
  "software engineer",
  "frontend developer",
  "backend developer",
  "full stack developer",
  "game developer",
  "mobile engineer",
  "devops engineer",
  "data engineer",
  "machine learning engineer",
  "unity developer",
  "unreal engine developer",
];

function parseTitle(raw: string): { title: string; company: string } {
  // Indeed titles: "Job Title - Company Name" or occasionally "Job Title at Company"
  const atMatch = raw.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) return { title: atMatch[1].trim(), company: atMatch[2].trim() };
  const dashIdx = raw.lastIndexOf(" - ");
  if (dashIdx > 0) return { title: raw.slice(0, dashIdx).trim(), company: raw.slice(dashIdx + 3).trim() };
  return { title: raw.trim(), company: "" };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchOneFeed(query: string): Promise<NormalizedJob[]> {
  const params = new URLSearchParams({ q: query, sort: "date", limit: "50" });
  const url = `https://www.indeed.com/rss?${params}`;

  let xml: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`[indeed] RSS ${res.status} for query "${query}" — skipping`);
      return [];
    }
    xml = await res.text();
  } catch (err) {
    console.warn(`[indeed] fetch error for "${query}": ${err instanceof Error ? err.message : err}`);
    return [];
  }

  // Cheerio parses RSS fine in xmlMode
  const $ = load(xml, { xmlMode: true });
  const jobs: NormalizedJob[] = [];

  $("item").each((_, el) => {
    const rawTitle = $(el).find("title").first().text().trim();
    if (!rawTitle) return;

    // <link> in RSS 2.0 sits between tags — cheerio xmlMode reads it as text
    const link =
      $(el).find("link").first().text().trim() ||
      $(el).find("guid").first().text().trim();
    if (!link || !link.startsWith("http")) return;

    const { title, company: titleCompany } = parseTitle(rawTitle);
    const company = $(el).find("source").first().text().trim() || titleCompany || "Unknown Company";

    const descHtml = $(el).find("description").first().text().trim();
    const descText = stripHtml(descHtml);
    const pubDate = $(el).find("pubDate").first().text().trim();
    // Indeed RSS sometimes includes <location> or buries it in description
    const locationEl = $(el).find("location").first().text().trim();

    // Job key from URL — jk= param is Indeed's stable job ID
    const jkMatch = link.match(/[?&]jk=([a-z0-9]+)/i);
    const externalId = jkMatch ? jkMatch[1] : link;

    const searchText = `${title} ${descText} ${locationEl}`;

    jobs.push({
      externalId,
      source: "indeed",
      sourceUrl: link,
      applyUrl: link,
      title,
      company,
      location: locationEl || null,
      workplaceType: inferWorkplaceType(searchText),
      employmentType: inferEmploymentType(searchText),
      experienceLevel: inferExperienceLevel(`${title} ${descText.slice(0, 400)}`),
      descriptionHtml: descHtml || null,
      descriptionText: descText || null,
      postedAt: pubDate ? (d => isNaN(d.getTime()) ? null : d)(new Date(pubDate)) : null,
      tags: parseTags(query, title),
    } satisfies NormalizedJob);
  });

  return jobs;
}

export async function fetchIndeedJobs(
  queries = (process.env.INDEED_SEARCH_QUERIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  maxJobs = Number(process.env.INDEED_MAX_JOBS ?? 400),
): Promise<NormalizedJob[]> {
  const activeQueries = queries.length > 0 ? queries : DEFAULT_QUERIES;
  const all: NormalizedJob[] = [];

  for (const query of activeQueries) {
    const results = await fetchOneFeed(query);
    console.log(`[indeed] "${query}" → ${results.length} jobs`);
    all.push(...results);
    // Polite delay between requests to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 600));
  }

  // Deduplicate by externalId
  const seen = new Set<string>();
  const deduped: NormalizedJob[] = [];
  for (const job of all) {
    if (job.externalId && !seen.has(job.externalId)) {
      seen.add(job.externalId);
      deduped.push(job);
    }
  }

  return deduped.slice(0, maxJobs);
}
