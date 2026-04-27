import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fetchGamesWorkbookJobs } from "@/lib/adapters/gamesWorkbook";
import { fetchGreenhouseJobs } from "@/lib/adapters/greenhouse";
import { fetchLeverJobs } from "@/lib/adapters/lever";
import { fetchAshbyJobs } from "@/lib/adapters/ashby";
import { fetchWorkableJobs } from "@/lib/adapters/workable";
import { fetchRemotiveJobs } from "@/lib/adapters/remotive";
import { fetchRecruiteeJobs } from "@/lib/adapters/recruitee";
import { fetchArbeitnowJobs } from "@/lib/adapters/arbeitnow";
import { fetchUsaJobs } from "@/lib/adapters/usajobs";
import { filterSoftwareJobs, parseCsvEnv } from "@/lib/filtering";
import { inferJobFields } from "@/lib/infer";
import { estimateSalary } from "@/lib/salary";
import { resolveJobLinks } from "@/lib/job-links";
import { deriveAtsBoardRoot, deriveWebsiteHome } from "@/lib/url-utils";
import { defaultUserProfile, type UserProfile } from "@/lib/profile";
import { scoreJobFit } from "@/lib/recommendations";
import type { NormalizedJob } from "@/types/jobs";

const US_STATE_ABBRS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export type JobFilters = {
  q?: string;
  departments?: string[];
  sort?: "recent" | "oldest" | "fit" | "salary";
  workplaceTypes?: string[];
  employmentTypes?: string[];
  experienceLevels?: string[];
  location?: string;
  source?: string;
  company?: string;
  recommendedOnly?: boolean;
  page?: number;
  limit?: number;
  since?: string;
  states?: string[];
  country?: string;
};

// Keywords matched against job title to define each department bucket.
// SQLite LIKE (used by Prisma contains) is case-insensitive for ASCII.
export const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  software_engineering: [
    "software engineer", "software developer", "backend engineer", "frontend engineer",
    "full stack", "fullstack", "web developer", "application engineer", "platform engineer",
    "site reliability", "sre", "devops", "cloud engineer", "infrastructure engineer",
    "embedded software", "firmware engineer", "build engineer", "test engineer",
  ],
  game_programming: [
    "gameplay programmer", "game programmer", "engine programmer", "graphics programmer",
    "tools engineer", "tools programmer", "game engineer", "rendering engineer",
    "physics programmer", "technical programmer", "network programmer",
    "unreal", "unity developer", "unity engineer",
  ],
  game_design: [
    "game designer", "level designer", "narrative designer", "systems designer",
    "environment artist", "technical designer", "content designer",
    "game artist", "concept artist", "3d artist", "vfx artist", "animator",
  ],
  mobile_development: [
    "ios engineer", "ios developer", "android engineer", "android developer",
    "mobile engineer", "mobile developer", "react native", "flutter developer",
  ],
  data_and_ml: [
    "data engineer", "machine learning", "ml engineer", "data scientist",
    "data analyst", "ai engineer", "research engineer", "applied scientist",
    "analytics engineer", "bi engineer",
  ],
};

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type CompanyLookupEntry = { slug: string; category: string; websiteUrl: string | null; careersUrl: string | null };
let _companyLookupCache: { data: Map<string, CompanyLookupEntry>; expires: number } | null = null;
const COMPANY_LOOKUP_TTL_MS = 5 * 60_000; // 5 minutes — companies change only during sync

async function getCompanyLookup() {
  if (_companyLookupCache && _companyLookupCache.expires > Date.now()) {
    return _companyLookupCache.data;
  }
  const companies = await prisma.company.findMany({
    select: { slug: true, name: true, companyCategory: true, websiteUrl: true, careersUrl: true },
  });
  const lookup = new Map<string, CompanyLookupEntry>();
  for (const company of companies) {
    lookup.set(normalizeName(company.name), {
      slug: company.slug,
      category: company.companyCategory,
      websiteUrl: company.websiteUrl,
      careersUrl: company.careersUrl,
    });
  }
  _companyLookupCache = { data: lookup, expires: Date.now() + COMPANY_LOOKUP_TTL_MS };
  return lookup;
}

async function ensureCompanyExistsFromJob(job: NormalizedJob) {
  const slug = job.company
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

  if (!slug) return;

  const careersUrl = deriveAtsBoardRoot(job.applyUrl) ?? deriveAtsBoardRoot(job.sourceUrl) ?? job.applyUrl;
  const websiteUrl = deriveWebsiteHome(job.applyUrl) ?? deriveWebsiteHome(job.sourceUrl);

  await prisma.company.upsert({
    where: { slug },
    create: {
      name: job.company,
      slug,
      websiteUrl: websiteUrl ?? undefined,
      careersUrl,
      headquarters: job.location ?? undefined,
      locations: JSON.stringify(job.location ? [job.location] : []),
      remotePolicy:
        job.workplaceType === "REMOTE"
          ? "REMOTE_FRIENDLY"
          : job.workplaceType === "HYBRID"
            ? "HYBRID"
            : job.workplaceType === "ONSITE"
              ? "ONSITE"
              : "UNKNOWN",
      companyCategory: /game|unity|unreal|play|player|studio|engine/i.test(
        `${job.title} ${job.company} ${job.descriptionText ?? ""}`,
      )
        ? "GAMING"
        : "SOFTWARE",
      companySize: undefined,
      stackTags: JSON.stringify(job.tags ?? []),
      gameTags: JSON.stringify((job.tags ?? []).filter((tag) => /unity|unreal|game|engine|graphics|gameplay/i.test(tag))),
      roleFocusTags: JSON.stringify([job.title]),
      industryTags: JSON.stringify([]),
      hiringSignals: JSON.stringify([`Imported from ${job.source}`]),
      atsProviders: JSON.stringify([job.source]),
      emailPatterns: JSON.stringify([]),
      notes: "Auto-created from ingested job data. Add verified company research, contacts, and outreach notes here.",
      outreachTips: "Use the related jobs on this page to decide who to contact and which team to mention.",
      activeHiring: true,
    },
    update: {
      websiteUrl: websiteUrl ?? undefined,
      careersUrl,
      headquarters: job.location ?? undefined,
      locations: JSON.stringify(job.location ? [job.location] : []),
      activeHiring: true,
      atsProviders: JSON.stringify(Array.from(new Set([job.source]))),
    },
  });
}

export async function listJobs(filters: JobFilters, profile: UserProfile | null = null) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

  const deptKeywords = (filters.departments ?? []).flatMap((d) => DEPARTMENT_KEYWORDS[d] ?? []);

  const where: Prisma.JobWhereInput = {
    isActive: true,
    AND: [
      filters.q
        ? { OR: [{ title: { contains: filters.q } }, { company: { contains: filters.q } }] }
        : {},
      deptKeywords.length > 0
        ? { OR: deptKeywords.map((kw) => ({ title: { contains: kw } })) }
        : {},
      filters.workplaceTypes?.length ? { workplaceType: { in: filters.workplaceTypes as never[] } } : {},
      filters.employmentTypes?.length ? { employmentType: { in: filters.employmentTypes as never[] } } : {},
      filters.experienceLevels?.length ? { experienceLevel: { in: filters.experienceLevels as never[] } } : {},
      filters.location ? { location: { contains: filters.location } } : {},
      filters.source ? { source: { contains: filters.source } } : {},
      filters.company ? { company: { contains: filters.company } } : {},
      filters.since ? { createdAt: { gt: new Date(filters.since) } } : {},
      // Country / state filter
      // US: require a US location pattern AND explicitly exclude locations that
      // name a foreign country — catches ambiguous codes like IN (Indiana/India)
      // and TN (Tennessee/Tamil Nadu).
      filters.country === "United States"
        ? {
            AND: [
              {
                OR: [
                  { location: { contains: "United States" } },
                  { location: { contains: " USA" } },
                  { location: { contains: ", USA" } },
                  ...(filters.states && filters.states.length > 0 ? filters.states : US_STATE_ABBRS).flatMap((s) => [
                    { location: { endsWith: `, ${s}` } },    // "Austin, TX"
                    { location: { contains: `, ${s} ` } },   // "Austin, TX 78701"
                    { location: { contains: `, ${s},` } },   // "Austin, TX, United States"
                  ]),
                ],
              },
              // Exclude jobs whose location string names a non-US country
              { NOT: { location: { contains: "India" } } },
              { NOT: { location: { contains: "Germany" } } },
              { NOT: { location: { contains: "Canada" } } },
              { NOT: { location: { contains: "United Kingdom" } } },
              { NOT: { location: { contains: "Australia" } } },
              { NOT: { location: { contains: "Brazil" } } },
              { NOT: { location: { contains: "Poland" } } },
              { NOT: { location: { contains: "Netherlands" } } },
              { NOT: { location: { contains: "France" } } },
              { NOT: { location: { contains: "Spain" } } },
              { NOT: { location: { contains: "Singapore" } } },
              { NOT: { location: { contains: "Romania" } } },
              { NOT: { location: { contains: "Pakistan" } } },
              { NOT: { location: { contains: "Philippines" } } },
            ],
          }
        : filters.country
          ? { location: { contains: filters.country } }
          : filters.states && filters.states.length > 0
            ? {
                OR: filters.states.flatMap((s) => [
                  { location: { endsWith: `, ${s}` } },
                  { location: { contains: `, ${s} ` } },
                  { location: { contains: `, ${s},` } },
                ]),
              }
            : {},
    ],
  };

  // Fit/salary sorts and recommendedOnly score a pool in memory then re-sort.
  // The pool WHERE clause is derived from the profile's scoring signals so that
  // every job that could possibly score > 0 is included, while zero-score jobs
  // (no skill/title/location/remote/level match) are excluded before fetching.
  // This is mathematically equivalent to scoring all 70k jobs but avoids loading
  // ~150MB of data that would all score 0 anyway.
  const needsPool = filters.recommendedOnly || filters.sort === "fit" || filters.sort === "salary";
  const skip = needsPool ? 0 : (page - 1) * limit;

  // Build profile-aware WHERE for pool queries.
  let poolWhere = where;
  if (needsPool && filters.sort !== "salary" && profile &&
    (profile.skills.length > 0 || profile.targetTitles.length > 0 || profile.preferredLocations.length > 0)) {
    const terms = [...profile.skills, ...profile.targetTitles];
    const profilePreFilter: Prisma.JobWhereInput = {
      OR: [
        // Skill / title hits in structured fields
        ...terms.map((t) => ({ tags: { contains: t } })),
        ...terms.map((t) => ({ title: { contains: t } })),
        // Location bonus signal
        ...profile.preferredLocations.map((l) => ({ location: { contains: l } })),
        // Workplace / level bonus signals
        { workplaceType: "REMOTE" as never },
        { workplaceType: "HYBRID" as never },
        { experienceLevel: "ENTRY" as never },
        { experienceLevel: "INTERN" as never },
      ],
    };
    poolWhere = { ...where, AND: [...(where.AND as Prisma.JobWhereInput[]), profilePreFilter] };
  }

  const take: number | undefined = needsPool
    ? (filters.sort === "salary" ? 5000 : undefined)
    : limit;

  // For the recommended pool we skip descriptionText entirely — structured
  // fields (workplaceType, experienceLevel, tags) are stored during sync and
  // are all that scoring needs. We fetch descriptions separately for the small
  // paged slice after ranking so we only read 8 rows instead of 50.
  const selectBase = {
    id: true, source: true, externalId: true, sourceUrl: true, applyUrl: true,
    title: true, company: true, location: true, workplaceType: true,
    employmentType: true, experienceLevel: true,
    postedAt: true, tags: true, isActive: true, lastSeenAt: true,
    createdAt: true, updatedAt: true,
  } as const;

  const [jobs, total, companyLookup] = await Promise.all([
    prisma.job.findMany({
      where: poolWhere,
      orderBy: filters.sort === "oldest"
        ? [{ postedAt: "asc" }, { updatedAt: "asc" }]
        : [{ postedAt: "desc" }, { updatedAt: "desc" }],
      skip,
      ...(take !== undefined ? { take } : {}),
      select: needsPool
        ? selectBase
        : { ...selectBase, descriptionText: true },
    }),
    prisma.job.count({ where }),
    getCompanyLookup(),
  ]);

  // ── Phase 1: score only — no inference, no links, no salary ──────────────
  // Structured fields (workplaceType, experienceLevel, tags) are written to
  // the DB at sync time via inferJobFields, so we trust the stored values here.
  // Calling inferJobFields again at query time on every job was the single
  // biggest CPU cost per page load.
  const lightEnriched = jobs.map((job: any) => {
    const tags = JSON.parse(job.tags || "[]") as string[];
    const companyMatch = companyLookup.get(normalizeName(job.company));

    const fit = profile
      ? scoreJobFit(
          {
            title: job.title,
            company: job.company,
            location: job.location,
            workplaceType: job.workplaceType,
            experienceLevel: job.experienceLevel,
            tags,
            companyCategory: companyMatch?.category,
          },
          profile,
        )
      : { score: 0, reasons: [] as string[] };

    return {
      ...job,
      tags,
      companySlug: companyMatch?.slug,
      companyCategory: companyMatch?.category ?? null,
      _companyMatch: companyMatch,
      fitScore: fit.score,
      fitReasons: fit.reasons,
    };
  });

  // ── Phase 2: sort + filter + paginate ─────────────────────────────────────
  const sortedByFit = [...lightEnriched].sort((a, b) => b.fitScore - a.fitScore);

  let sorted: typeof lightEnriched;
  if (filters.sort === "fit") {
    sorted = sortedByFit;
  } else if (filters.sort === "salary") {
    sorted = [...lightEnriched].sort((a, b) => {
      const aSal = estimateSalary({ title: a.title, experienceLevel: a.experienceLevel, employmentType: a.employmentType, location: a.location, company: a.company, tags: a.tags });
      const bSal = estimateSalary({ title: b.title, experienceLevel: b.experienceLevel, employmentType: b.employmentType, location: b.location, company: b.company, tags: b.tags });
      const aVal = aSal ? (aSal.low + aSal.high) / 2 : 0;
      const bVal = bSal ? (bSal.low + bSal.high) / 2 : 0;
      return bVal - aVal;
    });
  } else {
    sorted = lightEnriched;
  }

  // Threshold of 35: a remote (15) + entry-level (18) job clears it with 33,
  // and any single title hit (15) + remote (15) = 30 — pad catches the rest.
  const aboveThreshold = filters.recommendedOnly
    ? sortedByFit.filter((job: any) => job.fitScore >= 35)
    : sorted;

  // If too few jobs clear the threshold, pad with the next-best fits so the
  // dashboard is never empty when jobs actually exist in the database.
  const filtered =
    filters.recommendedOnly && aboveThreshold.length < limit
      ? sortedByFit.slice(0, limit)
      : aboveThreshold;

  const paged = needsPool ? filtered.slice((page - 1) * limit, page * limit) : filtered;

  // ── Phase 3: full enrich — links + salary on the display slice only ───────
  // This avoids running resolveJobLinks + estimateSalary on ~92 jobs that are
  // scored but never rendered.
  const fullyEnriched = paged.map((job: any) => {
    const { _companyMatch, ...rest } = job;
    const links = resolveJobLinks({
      applyUrl: job.applyUrl,
      sourceUrl: job.sourceUrl,
      companyCareersUrl: _companyMatch?.careersUrl,
      companyWebsiteUrl: _companyMatch?.websiteUrl,
    });
    const salary = estimateSalary({
      title: job.title,
      experienceLevel: job.experienceLevel,
      employmentType: job.employmentType,
      location: job.location,
      company: job.company,
      tags: job.tags,
    });
    return { ...rest, salary, ...links };
  });

  return {
    jobs: fullyEnriched,
    recommendedJobs: sortedByFit.slice(0, 8).map(({ _companyMatch, ...j }: any) => j),
    page,
    limit,
    total: needsPool ? filtered.length : total,
    totalPages: Math.max(1, Math.ceil((needsPool ? filtered.length : total) / limit)),
  };
}

export async function getJobById(id: string, profile: UserProfile | null = null) {
  const [job, companyLookup] = await Promise.all([
    prisma.job.findUnique({ where: { id } }),
    getCompanyLookup(),
  ]);
  if (!job) return null;
  const tags = JSON.parse(job.tags || "[]") as string[];
  const companyMatch = companyLookup.get(normalizeName(job.company));

  const inferred = inferJobFields(job.title, job.descriptionText);
  const workplaceType = job.workplaceType !== "UNKNOWN" ? job.workplaceType : inferred.workplaceType;
  const employmentType = job.employmentType !== "UNKNOWN" ? job.employmentType : inferred.employmentType;
  const experienceLevel = job.experienceLevel !== "UNKNOWN" ? job.experienceLevel : inferred.experienceLevel;

  const fit = profile
    ? scoreJobFit(
        {
          title: job.title,
          company: job.company,
          location: job.location,
          workplaceType,
          experienceLevel,
          tags,
          descriptionText: job.descriptionText,
          companyCategory: companyMatch?.category,
        },
        profile,
      )
    : { score: 0, reasons: [] as string[] };
  const links = resolveJobLinks({
    applyUrl: job.applyUrl,
    sourceUrl: job.sourceUrl,
    companyCareersUrl: companyMatch?.careersUrl,
    companyWebsiteUrl: companyMatch?.websiteUrl,
  });
  const salary = estimateSalary({
    title: job.title,
    experienceLevel,
    employmentType,
    location: job.location,
    company: job.company,
    tags,
  });

  return {
    ...job,
    workplaceType,
    employmentType,
    experienceLevel,
    tags,
    companySlug: companyMatch?.slug,
    companyCategory: companyMatch?.category ?? null,
    fitScore: fit.score,
    fitReasons: fit.reasons,
    salary,
    ...links,
  };
}

export async function updateJob(id: string, data: {
  workplaceType?: string;
  employmentType?: string;
  experienceLevel?: string;
  location?: string;
}) {
  return prisma.job.update({
    where: { id },
    data: {
      ...(data.workplaceType ? { workplaceType: data.workplaceType as never } : {}),
      ...(data.employmentType ? { employmentType: data.employmentType as never } : {}),
      ...(data.experienceLevel ? { experienceLevel: data.experienceLevel as never } : {}),
      ...(data.location !== undefined ? { location: data.location || null } : {}),
    },
  });
}

async function runSingleSource(source: string, fetcher: () => Promise<NormalizedJob[]>) {
  console.log(`[sync] Starting source: ${source}`);
  const syncRun = await prisma.syncRun.create({
    data: {
      source,
      jobsFetched: 0,
      jobsUpserted: 0,
    },
  });

  try {
    const jobs = await fetcher();
    console.log(`[sync] ${source} — fetched ${jobs.length} jobs`);

    // SQLite is single-writer — upserts must run sequentially to avoid
    // write-lock contention and P1008 socket timeouts.
    let jobsUpserted = 0;

    for (const job of jobs) {
      // Fill UNKNOWN fields from inference before writing to DB.
      // create: always infer so new jobs are stored with real values.
      // update: only overwrite the three structured fields when the source
      //         provides a real value — preserves manual edits made via the UI.
      const inferred = inferJobFields(job.title, job.descriptionText);
      const workplaceType =
        job.workplaceType !== "UNKNOWN" ? job.workplaceType : inferred.workplaceType;
      const employmentType =
        job.employmentType !== "UNKNOWN" ? job.employmentType : inferred.employmentType;
      const experienceLevel =
        job.experienceLevel !== "UNKNOWN" ? job.experienceLevel : inferred.experienceLevel;

      await prisma.job.upsert({
        where: {
          source_externalId: {
            source: job.source,
            externalId: job.externalId,
          },
        },
        create: {
          ...job,
          workplaceType,
          employmentType,
          experienceLevel,
          tags: JSON.stringify(job.tags),
          lastSeenAt: new Date(),
          isActive: true,
        },
        update: {
          title: job.title,
          company: job.company,
          location: job.location,
          sourceUrl: job.sourceUrl,
          applyUrl: job.applyUrl,
          descriptionHtml: job.descriptionHtml,
          descriptionText: job.descriptionText,
          postedAt: job.postedAt,
          tags: JSON.stringify(job.tags),
          lastSeenAt: new Date(),
          isActive: true,
          // Only update structured fields if source gave a real value;
          // otherwise leave whatever is in the DB (manual edit or prior inference).
          ...(job.workplaceType !== "UNKNOWN" ? { workplaceType: job.workplaceType } : {}),
          ...(job.employmentType !== "UNKNOWN" ? { employmentType: job.employmentType } : {}),
          ...(job.experienceLevel !== "UNKNOWN" ? { experienceLevel: job.experienceLevel } : {}),
        },
      });
      jobsUpserted++;
    }

    // Deduplicate companies by slug before upserting
    const seenSlugs = new Set<string>();
    const uniqueJobs = jobs.filter((job) => {
      const slug = job.company
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80);
      if (!slug || seenSlugs.has(slug)) return false;
      seenSlugs.add(slug);
      return true;
    });

    // Company upserts also sequential — same single-writer constraint
    for (const job of uniqueJobs) {
      await ensureCompanyExistsFromJob(job);
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        jobsFetched: jobs.length,
        jobsUpserted,
        finishedAt: new Date(),
      },
    });

    console.log(`[sync] ${source} — done (${jobsUpserted} upserted)`);
    return { source, jobsFetched: jobs.length, jobsUpserted, ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[sync] ${source} — FAILED: ${message}`);
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        finishedAt: new Date(),
        error: message,
      },
    });
    return { source, jobsFetched: 0, jobsUpserted: 0, ok: false as const, error: message };
  }
}

export type SyncSourceResult = {
  source: string;
  jobsFetched: number;
  jobsUpserted: number;
  ok: boolean;
  error?: string;
};

export type SyncProgressCallback = (
  result: SyncSourceResult,
  completed: number,
  total: number,
  runningFetched: number,
  runningUpserted: number,
) => void;

export type SyncStartCallback = (source: string, index: number, total: number) => void;

type SourceDef = { source: string; fetcher: () => Promise<NormalizedJob[]> };

export async function syncAllJobs(
  onProgress?: SyncProgressCallback,
  onStart?: SyncStartCallback,
) {
  const companySources = await prisma.company.findMany({
    where: {
      activeHiring: true,
      sourceType: { not: null },
      sourceToken: { not: null },
    },
    select: { sourceType: true, sourceToken: true },
  });

  const mergeTokens = (envName: string, sourceType: string) => {
    const values = new Set(parseCsvEnv(envName));
    companySources
      .filter((item) => item.sourceType?.toUpperCase() === sourceType && item.sourceToken)
      .forEach((item) => values.add(item.sourceToken!));
    return [...values];
  };

  const greenhouseTokens = mergeTokens("GREENHOUSE_COMPANY_TOKENS", "GREENHOUSE");
  const leverTokens = mergeTokens("LEVER_COMPANY_TOKENS", "LEVER");
  const ashbyTokens = mergeTokens("ASHBY_COMPANY_TOKENS", "ASHBY");
  const workableAccounts = mergeTokens("WORKABLE_COMPANY_TOKENS", "WORKABLE");
  const recruiteeCompanies = mergeTokens("RECRUITEE_COMPANY_TOKENS", "RECRUITEE");
  const useRemotive = (process.env.ENABLE_REMOTIVE ?? "true").toLowerCase() === "true";
  const useArbeitnow = (process.env.ENABLE_ARBEITNOW ?? "true").toLowerCase() === "true";
  const useUsaJobs = (process.env.ENABLE_USAJOBS ?? "false").toLowerCase() === "true";
  const useGamesWorkbook = (process.env.ENABLE_GAMES_WORKBOOK ?? "true").toLowerCase() === "true";
  const softwareOnly = (process.env.SOFTWARE_ONLY ?? "true").toLowerCase() === "true";

  const maybeFilter = async (fetcher: () => Promise<NormalizedJob[]>) => {
    const jobs = await fetcher();
    return softwareOnly ? filterSoftwareJobs(jobs) : jobs;
  };

  // Build a definition list so we can emit onStart before each source runs.
  const sourceDefs: SourceDef[] = [];

  greenhouseTokens.forEach((token) => {
    sourceDefs.push({ source: `greenhouse:${token}`, fetcher: () => maybeFilter(() => fetchGreenhouseJobs(token)) });
  });
  leverTokens.forEach((token) => {
    sourceDefs.push({ source: `lever:${token}`, fetcher: () => maybeFilter(() => fetchLeverJobs(token)) });
  });
  ashbyTokens.forEach((token) => {
    sourceDefs.push({ source: `ashby:${token}`, fetcher: () => maybeFilter(() => fetchAshbyJobs(token)) });
  });
  workableAccounts.forEach((account) => {
    sourceDefs.push({ source: `workable:${account}`, fetcher: () => maybeFilter(() => fetchWorkableJobs(account)) });
  });
  recruiteeCompanies.forEach((company) => {
    sourceDefs.push({ source: `recruitee:${company}`, fetcher: () => maybeFilter(() => fetchRecruiteeJobs(company)) });
  });
  if (useRemotive) {
    sourceDefs.push({ source: "remotive", fetcher: () => maybeFilter(() => fetchRemotiveJobs()) });
  }
  if (useArbeitnow) {
    sourceDefs.push({ source: "arbeitnow", fetcher: () => maybeFilter(() => fetchArbeitnowJobs()) });
  }
  if (useUsaJobs) {
    sourceDefs.push({ source: "usajobs", fetcher: () => maybeFilter(() => fetchUsaJobs()) });
  }
  if (useGamesWorkbook) {
    sourceDefs.push({ source: "games-workbook", fetcher: () => maybeFilter(() => fetchGamesWorkbookJobs()) });
  }

  if (!sourceDefs.length) return [];

  const total = sourceDefs.length;
  let completed = 0;
  let runningFetched = 0;
  let runningUpserted = 0;
  const results: SyncSourceResult[] = [];

  // SQLite is single-writer — sources run one at a time.
  for (const { source, fetcher } of sourceDefs) {
    onStart?.(source, completed, total);
    const result = await runSingleSource(source, fetcher);
    completed++;
    runningFetched += result.jobsFetched;
    runningUpserted += result.jobsUpserted;
    onProgress?.(result, completed, total, runningFetched, runningUpserted);
    results.push(result);
  }

  return results;
}
