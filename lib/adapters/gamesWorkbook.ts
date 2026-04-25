import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

const DEFAULT_API_URL = "https://games-jobs-workbook.replit.app/api/job-listings";

type UnknownRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === "number") return String(value);
  return null;
}

function pickFirstString(obj: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(obj[key]);
    if (value) return value;
  }
  return null;
}

function looksLikeUrl(value: string | null): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function pickApplyUrl(obj: UnknownRecord): string | null {
  const direct = pickFirstString(obj, [
    "applyUrl",
    "apply_url",
    "jobUrl",
    "job_url",
    "url",
    "link",
    "postingUrl",
    "posting_url",
  ]);
  if (looksLikeUrl(direct)) return direct;

  const nestedValues = [obj.links, obj.urls, obj.metadata, obj.attributes].filter(
    (value): value is UnknownRecord => Boolean(value && typeof value === "object" && !Array.isArray(value)),
  );

  for (const nested of nestedValues) {
    const nestedUrl = pickFirstString(nested, [
      "applyUrl",
      "apply_url",
      "jobUrl",
      "job_url",
      "url",
      "link",
      "postingUrl",
      "posting_url",
    ]);
    if (looksLikeUrl(nestedUrl)) return nestedUrl;
  }

  return null;
}

function pickDescription(obj: UnknownRecord): string | null {
  return pickFirstString(obj, [
    "description",
    "descriptionText",
    "description_text",
    "summary",
    "details",
    "content",
    "body",
  ]);
}

function pickPostedAt(obj: UnknownRecord): Date | null {
  const raw = pickFirstString(obj, [
    "postedAt",
    "posted_at",
    "createdAt",
    "created_at",
    "publishedAt",
    "published_at",
    "date",
  ]);

  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function collectCandidates(value: unknown, out: UnknownRecord[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectCandidates(item, out);
    return;
  }

  if (!value || typeof value !== "object") return;
  const record = value as UnknownRecord;

  const title = pickFirstString(record, ["title", "jobTitle", "job_title", "name", "role", "position"]);
  const url = pickApplyUrl(record);

  if (title && url) out.push(record);

  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") collectCandidates(nested, out);
  }
}

function mapJob(record: UnknownRecord, index: number, apiUrl: string): NormalizedJob | null {
  const title = pickFirstString(record, ["title", "jobTitle", "job_title", "name", "role", "position"]);
  const company =
    pickFirstString(record, ["company", "companyName", "company_name", "studio", "employer"]) || "Unknown Company";
  const applyUrl = pickApplyUrl(record);
  const description = pickDescription(record);

  if (!title || !applyUrl) return null;

  const location =
    pickFirstString(record, ["location", "jobLocation", "job_location", "city", "region", "country"]) || null;

  const workplaceHint = pickFirstString(record, [
    "workplaceType",
    "workplace_type",
    "remote",
    "remoteType",
    "remote_type",
    "arrangement",
  ]);
  const employmentHint = pickFirstString(record, [
    "employmentType",
    "employment_type",
    "type",
    "jobType",
    "job_type",
    "commitment",
  ]);
  const experienceHint = pickFirstString(record, ["experienceLevel", "experience_level", "seniority", "level"]);

  const tags: string[] = [];
  for (const possibleArray of [record.tags, record.skills, record.categories, record.technologies]) {
    if (Array.isArray(possibleArray)) {
      for (const item of possibleArray) {
        const tag = asString(item);
        if (tag) tags.push(tag);
      }
    }
  }

  const externalId =
    pickFirstString(record, ["id", "_id", "jobId", "job_id", "slug"]) || `${company}-${title}-${index}`;
  const searchableText = [title, description ?? "", location ?? "", ...tags].join(" ");

  return {
    externalId: `games-workbook-${externalId}`,
    source: "games-workbook",
    sourceUrl: apiUrl,
    applyUrl,
    title,
    company,
    location,
    workplaceType: inferWorkplaceType(`${workplaceHint ?? ""} ${searchableText}`),
    employmentType: inferEmploymentType(`${employmentHint ?? ""} ${searchableText}`),
    experienceLevel: inferExperienceLevel(`${experienceHint ?? ""} ${searchableText}`),
    descriptionHtml: null,
    descriptionText: description,
    postedAt: pickPostedAt(record),
    tags: parseTags(...tags),
  };
}

export async function fetchGamesWorkbookJobs(apiUrl = process.env.GAMES_WORKBOOK_API_URL || DEFAULT_API_URL) {
  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "JobFinder/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Games Workbook API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const candidates: UnknownRecord[] = [];
  collectCandidates(data, candidates);

  const deduped = new Map<string, NormalizedJob>();
  candidates.forEach((candidate, index) => {
    const job = mapJob(candidate, index, apiUrl);
    if (!job) return;
    const key = `${job.title}::${job.company}::${job.applyUrl}`;
    if (!deduped.has(key)) deduped.set(key, job);
  });

  return [...deduped.values()];
}
