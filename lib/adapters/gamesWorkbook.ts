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
    "jobLink",
    "job_link",
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
    "activatedDate",
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

  // API returns city/state/country as separate fields — assemble them
  const city = pickFirstString(record, ["city"]);
  const state = pickFirstString(record, ["state"]);
  const country = pickFirstString(record, ["country"]);
  const location =
    pickFirstString(record, ["location", "jobLocation", "job_location"]) ||
    [city, state, country].filter(Boolean).join(", ") ||
    null;

  const workplaceHint = pickFirstString(record, [
    "locationType",
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
  // Capture flat string categorization fields as tags
  const overallCategory = asString(record.overallCategory);
  if (overallCategory) tags.push(overallCategory);

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

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000]; // 3 retries: 5s, 15s, 30s

export async function fetchGamesWorkbookJobs(apiUrl = process.env.GAMES_WORKBOOK_API_URL || DEFAULT_API_URL) {
  let data: unknown;
  let lastErr = "";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1]!;
      console.log(`[games-workbook] retry ${attempt}/${RETRY_DELAYS_MS.length} in ${delay / 1000}s…`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000); // 2 min — large payload

    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json", "User-Agent": "JobFinder/1.0" },
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        lastErr = `${response.status} ${response.statusText}`;
        console.warn(`[games-workbook] ${lastErr} — Replit app may be waking up, will retry`);
        continue;
      }

      if (!response.ok) {
        console.warn(`[games-workbook] HTTP ${response.status} ${response.statusText} — skipping source`);
        return [];
      }

      data = await response.json();
      break; // success
    } catch (err) {
      clearTimeout(timer);
      lastErr = err instanceof Error ? err.message : String(err);
      console.warn(`[games-workbook] fetch error (attempt ${attempt + 1}): ${lastErr}`);
    }
  }

  if (data === undefined) {
    console.warn(`[games-workbook] all retries failed (${lastErr}) — returning 0 jobs`);
    return [];
  }

  // Fast path: API returns a flat array with known shape (jobLink field present)
  const candidates: UnknownRecord[] =
    Array.isArray(data) && data.length > 0 && "jobLink" in (data[0] as object)
      ? (data as UnknownRecord[])
      : (() => { const out: UnknownRecord[] = []; collectCandidates(data, out); return out; })();

  const deduped = new Map<string, NormalizedJob>();
  candidates.forEach((candidate, index) => {
    const job = mapJob(candidate, index, apiUrl);
    if (!job) return;
    const key = `${job.title}::${job.company}::${job.applyUrl}`;
    if (!deduped.has(key)) deduped.set(key, job);
  });

  return [...deduped.values()];
}
