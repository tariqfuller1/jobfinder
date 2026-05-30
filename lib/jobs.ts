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
import { fetchWorkWithIndiesJobs } from "@/lib/adapters/workWithIndies";
import { fetchHimalayasJobs } from "@/lib/adapters/himalayas";
import { fetchRemoteOKJobs } from "@/lib/adapters/remoteok";
import { fetchWeWorkRemotelyJobs } from "@/lib/adapters/weworkremotely";
import { fetchJobicyJobs } from "@/lib/adapters/jobicy";
import { filterSoftwareJobs, parseCsvEnv, TECH_JOB_TITLE_KEYWORDS } from "@/lib/filtering";
import { classifyJobRole } from "@/lib/classify";
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

// Full state names for matching location strings that spell out the state (e.g. "North Carolina").
const US_STATE_FULL_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
  KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
  MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
  MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  DC:"District of Columbia",
};

function statePatterns(abbr: string): Prisma.JobWhereInput[] {
  const fullName = US_STATE_FULL_NAMES[abbr];
  return [
    { location: { endsWith: `, ${abbr}` } },       // "Charlotte, NC"
    { location: { contains: `, ${abbr} ` } },       // "Charlotte, NC 27601"
    { location: { contains: `, ${abbr},` } },       // "Charlotte, NC, United States"
    ...(fullName ? [
      { location: { contains: fullName } },          // "Charlotte, North Carolina, United States"
    ] : []),
  ];
}

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
  postedWithin?: "1h" | "24h" | "7d";
};

// Keywords matched against job title to define each department bucket for filtering.
// SQLite LIKE (used by Prisma contains) is case-insensitive for ASCII.
export const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  frontend: [
    "frontend engineer", "frontend developer", "front-end engineer", "front-end developer",
    "ui engineer", "ui developer", "react developer", "react engineer",
    "angular developer", "vue developer", "next.js developer", "web developer",
  ],
  backend: [
    "backend engineer", "backend developer", "back-end engineer", "back-end developer",
    "api engineer", "api developer", "python developer", "python engineer",
    "java developer", "java engineer", "golang developer", "go developer",
    "rust developer", "rust engineer", "node developer", "c++ developer",
    "c++ engineer", "c++ programmer", "c# developer", ".net developer",
    "software engineer", "software developer", "application engineer",
  ],
  full_stack: [
    "full stack", "fullstack", "full-stack",
  ],
  mobile: [
    "ios engineer", "ios developer", "android engineer", "android developer",
    "mobile engineer", "mobile developer", "react native", "flutter developer",
  ],
  game_programming: [
    "gameplay programmer", "game programmer", "engine programmer", "graphics programmer",
    "tools engineer", "tools programmer", "game engineer", "rendering engineer",
    "physics programmer", "network programmer", "unity developer", "unity engineer",
    "unreal developer", "unreal engineer", "game developer",
  ],
  game_design: [
    "game designer", "level designer", "narrative designer", "systems designer",
    "environment artist", "technical designer", "content designer",
    "game artist", "concept artist", "3d artist", "vfx artist", "animator", "technical artist",
  ],
  data_and_ml: [
    "data engineer", "machine learning", "ml engineer", "data scientist",
    "data analyst", "ai engineer", "research engineer", "applied scientist",
    "analytics engineer", "bi engineer", "data science",
  ],
  devops: [
    "devops", "site reliability", "sre", "cloud engineer", "platform engineer",
    "infrastructure engineer", "build engineer", "release engineer",
  ],
  qa: [
    "qa engineer", "quality assurance", "test engineer", "test automation",
    "sdet", "automation engineer",
  ],
  embedded: [
    "embedded software", "embedded engineer", "firmware engineer", "firmware developer",
  ],
};

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseTagsSafe(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
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

  // Standing filter: only surface tech/gaming jobs. Manual jobs bypass this so
  // a user-added entry (any title) always shows. This catches bad data already
  // in the DB from over-broad description-text matching during earlier syncs.
  const techTitleFilter: Prisma.JobWhereInput = {
    OR: [
      { source: "manual" },
      ...TECH_JOB_TITLE_KEYWORDS.map((kw) => ({ title: { contains: kw } })),
    ],
  };

  const where: Prisma.JobWhereInput = {
    isActive: true,
    AND: [
      techTitleFilter,
      filters.q
        ? { OR: [{ title: { contains: filters.q } }, { company: { contains: filters.q } }, { location: { contains: filters.q } }] }
        : {},
      deptKeywords.length > 0
        ? { OR: deptKeywords.map((kw) => ({ title: { contains: kw } })) }
        : {},
      filters.workplaceTypes?.length ? { workplaceType: { in: filters.workplaceTypes as never[] } } : {},
      filters.employmentTypes?.length ? { employmentType: { in: filters.employmentTypes as never[] } } : {},
      // When experience levels are filtered, always include UNKNOWN so jobs that
      // didn't specify a level (but could be entry or mid) are never silently dropped.
      filters.experienceLevels?.length
        ? { experienceLevel: { in: [...new Set([...filters.experienceLevels, "UNKNOWN"])] as never[] } }
        : {},
      filters.location ? { location: { contains: filters.location } } : {},
      filters.source ? { source: { contains: filters.source } } : {},
      filters.company ? { company: { contains: filters.company } } : {},
      filters.since ? { createdAt: { gt: new Date(filters.since) } } : {},
      filters.postedWithin ? (() => {
        const ms = filters.postedWithin === "1h" ? 60 * 60 * 1000
          : filters.postedWithin === "24h" ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;
        const cutoff = new Date(Date.now() - ms);
        return {
          OR: [
            { postedAt: { gte: cutoff } },
            { AND: [{ postedAt: null }, { createdAt: { gte: cutoff } }] },
          ],
        };
      })() : {},
      // Country / state filter
      // US: require a US location pattern AND explicitly exclude locations that
      // name a foreign country — catches ambiguous codes like IN (Indiana/India)
      // and TN (Tennessee/Tamil Nadu).
      filters.country === "United States"
        ? {
            AND: [
              {
                OR: filters.states && filters.states.length > 0
                  // Specific states selected: match only those states (abbreviation AND full name).
                  // No generic USA patterns — those would let any US job through.
                  ? filters.states.flatMap((s) => statePatterns(s))
                  : [
                      { location: { contains: "United States" } },
                      { location: { contains: " USA" } },
                      { location: { contains: ", USA" } },
                      ...US_STATE_ABBRS.flatMap((s) => statePatterns(s)),
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
            ? { OR: filters.states.flatMap((s) => statePatterns(s)) }
            : {},
    ],
  };

  // Fit sort and recommendedOnly score a bounded pool in memory then re-sort.
  // Salary sort uses a pre-computed DB column (salaryMid) — no in-memory work.
  const needsPool = filters.recommendedOnly || filters.sort === "fit";
  const skip = needsPool ? 0 : (page - 1) * limit;

  // Build profile-aware WHERE for pool queries.
  // Only strong signals (skill/title/location matches) narrow the pool.
  // Remote/entry bonuses still apply during scoring but must not pull ALL
  // remote or entry jobs into memory — that's what caused the scaling issue.
  let poolWhere = where;
  if (needsPool && profile &&
    (profile.skills.length > 0 || profile.targetTitles.length > 0 || profile.preferredLocations.length > 0)) {
    const terms = [...profile.skills, ...profile.targetTitles];
    const locationSignals = profile.preferredLocations.flatMap((l) => {
      if (l === "Remote US") return [{ workplaceType: "REMOTE" as never }];
      if (/^[A-Z]{2}$/.test(l)) return statePatterns(l);
      return [{ location: { contains: l } }];
    });
    const profilePreFilter: Prisma.JobWhereInput = {
      OR: [
        ...terms.map((t) => ({ tags: { contains: t } })),
        ...terms.map((t) => ({ title: { contains: t } })),
        ...locationSignals,
      ],
    };
    poolWhere = { ...where, AND: [...(where.AND as Prisma.JobWhereInput[]), profilePreFilter] };
  }

  const take: number | undefined = needsPool ? undefined : limit;

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
        : filters.sort === "salary"
          ? [{ salaryMid: { sort: "desc", nulls: "last" } }, { postedAt: "desc" }]
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
    const tags = parseTagsSafe(job.tags);
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
      roleCategory: classifyJobRole(job.title, tags),
      companySlug: companyMatch?.slug,
      companyCategory: companyMatch?.category ?? null,
      _companyMatch: companyMatch,
      fitScore: fit.score,
      fitReasons: fit.reasons,
    };
  });

  // ── Phase 2: sort + filter + paginate ─────────────────────────────────────
  const sortedByFit = [...lightEnriched].sort((a, b) => b.fitScore - a.fitScore);

  // Salary sort is handled at the DB level (ORDER BY salaryMid DESC NULLS LAST).
  // The only in-memory sort remaining is fit score.
  const sorted: typeof lightEnriched = filters.sort === "fit" ? sortedByFit : lightEnriched;

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
  const tags = parseTagsSafe(job.tags);
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

  // Normalize description: prefer descriptionHtml; fall back to descriptionText
  // if it looks like HTML (literal tags or entity-encoded). Entity-decode before use.
  const decodeEntities = (s: string) =>
    s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  const rawHtml = job.descriptionHtml || null;
  const rawText = job.descriptionText || null;

  // If descriptionHtml is entity-encoded (has &lt; but no literal < tags), decode it
  // so that sanitizeJobHtml sees real HTML tags rather than escaped text.
  const htmlNeedsDecoding = rawHtml ? /&lt;/.test(rawHtml) && !/<[a-zA-Z]/.test(rawHtml) : false;
  const fixedHtml = htmlNeedsDecoding ? decodeEntities(rawHtml!) : rawHtml;

  const textHasHtml = rawText ? /[<>]|&lt;|&gt;/.test(rawText) : false;
  const descriptionHtml = fixedHtml ?? (textHasHtml ? decodeEntities(rawText!) : null);
  const descriptionText = (fixedHtml || textHasHtml) ? null : rawText;

  return {
    ...job,
    descriptionHtml,
    descriptionText,
    workplaceType,
    employmentType,
    experienceLevel,
    tags,
    roleCategory: classifyJobRole(job.title, tags),
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

// Process jobs in chunks of this size so the full array isn't held in memory
// while we upsert sequentially. splice() drains the array as we go, letting
// GC collect processed objects rather than keeping everything until the end.
const UPSERT_CHUNK = 25;

async function runSingleSource(source: string, fetcher: () => Promise<NormalizedJob[]>) {
  const syncRun = await prisma.syncRun.create({
    data: { source, jobsFetched: 0, jobsUpserted: 0 },
  });

  try {
    const jobs = await fetcher();
    const totalFetched = jobs.length;
    let jobsUpserted = 0;

    // Track seen company slugs in the same pass as job upserts — avoids
    // keeping a second uniqueJobs array in memory.
    const seenSlugs = new Set<string>();

    // Drain the array chunk by chunk. Each spliced chunk goes out of scope
    // after the inner loop, so GC can collect those job objects immediately.
    while (jobs.length > 0) {
      const chunk = jobs.splice(0, UPSERT_CHUNK);

      for (const job of chunk) {
        const inferred = inferJobFields(job.title, job.descriptionText);
        const workplaceType =
          job.workplaceType !== "UNKNOWN" ? job.workplaceType : inferred.workplaceType;
        const employmentType =
          job.employmentType !== "UNKNOWN" ? job.employmentType : inferred.employmentType;
        const experienceLevel =
          job.experienceLevel !== "UNKNOWN" ? job.experienceLevel : inferred.experienceLevel;

        const salaryEst = estimateSalary({
          title: job.title,
          experienceLevel,
          employmentType,
          location: job.location,
          company: job.company,
          tags: job.tags,
        });
        const salaryMid = Math.round((salaryEst.low + salaryEst.high) / 2);

        await prisma.job.upsert({
          where: { source_externalId: { source: job.source, externalId: job.externalId } },
          create: {
            ...job,
            workplaceType,
            employmentType,
            experienceLevel,
            tags: JSON.stringify(job.tags),
            salaryMid,
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
            tags: JSON.stringify(job.tags),
            salaryMid,
            lastSeenAt: new Date(),
            isActive: true,
            ...(job.workplaceType !== "UNKNOWN" ? { workplaceType: job.workplaceType } : {}),
            ...(job.employmentType !== "UNKNOWN" ? { employmentType: job.employmentType } : {}),
            ...(job.experienceLevel !== "UNKNOWN" ? { experienceLevel: job.experienceLevel } : {}),
          },
        });
        jobsUpserted++;

        // Company upsert in the same pass — no second array needed
        const slug = job.company
          .toLowerCase()
          .replace(/&/g, " and ")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 80);
        if (slug && !seenSlugs.has(slug)) {
          seenSlugs.add(slug);
          try {
            await ensureCompanyExistsFromJob(job);
          } catch {
            // non-fatal, not logged
          }
        }
      }
      // chunk goes out of scope here — GC can collect
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { jobsFetched: totalFetched, jobsUpserted, finishedAt: new Date() },
    });

    return { source, jobsFetched: totalFetched, jobsUpserted, ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[sync] ${source} — FAILED: ${message}`);
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { finishedAt: new Date(), error: message },
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
    select: { sourceType: true, sourceToken: true, name: true },
  });

  // Map "GREENHOUSE:airbnb" → "Airbnb" so adapter tokens don't overwrite
  // the proper display name set via the company admin or CSV import.
  const companyNameByToken = new Map<string, string>();
  for (const c of companySources) {
    if (c.sourceType && c.sourceToken && c.name) {
      companyNameByToken.set(`${c.sourceType.toUpperCase()}:${c.sourceToken}`, c.name);
    }
  }
  const withProperName = (sourceType: string, token: string, fetcher: () => Promise<NormalizedJob[]>) => {
    const properName = companyNameByToken.get(`${sourceType.toUpperCase()}:${token}`);
    if (!properName) return fetcher;
    return async () => {
      const jobs = await fetcher();
      return jobs.map((j) => ({ ...j, company: properName }));
    };
  };

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
  const useWorkWithIndies = (process.env.ENABLE_WORK_WITH_INDIES ?? "true").toLowerCase() === "true";
  const useHimalayas = (process.env.ENABLE_HIMALAYAS ?? "true").toLowerCase() === "true";
  const useRemoteOK = (process.env.ENABLE_REMOTEOK ?? "true").toLowerCase() === "true";
  const useWeWorkRemotely = (process.env.ENABLE_WEWORKREMOTELY ?? "true").toLowerCase() === "true";
  const useJobicy = (process.env.ENABLE_JOBICY ?? "true").toLowerCase() === "true";
  const softwareOnly = (process.env.SOFTWARE_ONLY ?? "true").toLowerCase() === "true";

  const maybeFilter = async (fetcher: () => Promise<NormalizedJob[]>) => {
    const jobs = await fetcher();
    return softwareOnly ? filterSoftwareJobs(jobs) : jobs;
  };

  // Build a definition list so we can emit onStart before each source runs.
  const sourceDefs: SourceDef[] = [];

  greenhouseTokens.forEach((token) => {
    sourceDefs.push({ source: `greenhouse:${token}`, fetcher: withProperName("GREENHOUSE", token, () => maybeFilter(() => fetchGreenhouseJobs(token))) });
  });
  leverTokens.forEach((token) => {
    sourceDefs.push({ source: `lever:${token}`, fetcher: withProperName("LEVER", token, () => maybeFilter(() => fetchLeverJobs(token))) });
  });
  ashbyTokens.forEach((token) => {
    sourceDefs.push({ source: `ashby:${token}`, fetcher: withProperName("ASHBY", token, () => maybeFilter(() => fetchAshbyJobs(token))) });
  });
  if (workableAccounts.length === 0) {
  }
  workableAccounts.forEach((account) => {
    sourceDefs.push({ source: `workable:${account}`, fetcher: withProperName("WORKABLE", account, () => maybeFilter(() => fetchWorkableJobs(account))) });
  });
  if (recruiteeCompanies.length === 0) {
  }
  recruiteeCompanies.forEach((company) => {
    sourceDefs.push({ source: `recruitee:${company}`, fetcher: withProperName("RECRUITEE", company, () => maybeFilter(() => fetchRecruiteeJobs(company))) });
  });
  if (useRemotive) {
    sourceDefs.push({ source: "remotive", fetcher: () => maybeFilter(() => fetchRemotiveJobs()) });
  }
  if (useArbeitnow) {
    sourceDefs.push({ source: "arbeitnow", fetcher: () => maybeFilter(() => fetchArbeitnowJobs()) });
  }
  if (useUsaJobs) {
    const hasApiKey = !!process.env.USAJOBS_API_KEY?.trim();
    const hasEmail = !!process.env.USAJOBS_USER_AGENT_EMAIL?.trim();
    if (!hasApiKey || !hasEmail) {
      // skipped silently
    } else {
      sourceDefs.push({ source: "usajobs", fetcher: () => maybeFilter(() => fetchUsaJobs()) });
    }
  }
  if (useGamesWorkbook) {
    sourceDefs.push({ source: "games-workbook", fetcher: () => maybeFilter(() => fetchGamesWorkbookJobs()) });
  }
  if (useWorkWithIndies) {
    sourceDefs.push({ source: "workwithindies", fetcher: () => maybeFilter(() => fetchWorkWithIndiesJobs()) });
  }
  if (useHimalayas) {
    sourceDefs.push({ source: "himalayas", fetcher: () => maybeFilter(() => fetchHimalayasJobs()) });
  }
  if (useRemoteOK) {
    sourceDefs.push({ source: "remoteok", fetcher: () => maybeFilter(() => fetchRemoteOKJobs()) });
  }
  if (useWeWorkRemotely) {
    sourceDefs.push({ source: "weworkremotely", fetcher: () => maybeFilter(() => fetchWeWorkRemotelyJobs()) });
  }
  if (useJobicy) {
    sourceDefs.push({ source: "jobicy", fetcher: () => maybeFilter(() => fetchJobicyJobs()) });
  }

  if (!sourceDefs.length) return [];

  const total = sourceDefs.length;
  let completed = 0;
  let runningFetched = 0;
  let runningUpserted = 0;
  const results: SyncSourceResult[] = [];

  // SQLite is single-writer — sources run one at a time.
  // A short pause between sources gives GC a chance to collect the previous
  // source's job objects before the next fetch allocates new ones.
  for (const { source, fetcher } of sourceDefs) {
    onStart?.(source, completed, total);
    const result = await runSingleSource(source, fetcher);
    completed++;
    runningFetched += result.jobsFetched;
    runningUpserted += result.jobsUpserted;
    onProgress?.(result, completed, total, runningFetched, runningUpserted);
    results.push(result);
    await new Promise((res) => setTimeout(res, 500));
  }

  const pruned = await pruneStaleJobs();
  return { results, pruned };
}

async function pruneStaleJobs(): Promise<{ deactivated: number; deleted: number }> {
  const now = Date.now();

  // Mark inactive: jobs not seen in any sync for 21 days — they've been
  // removed from the source feed. Never touch manually-added jobs.
  const { count: deactivated } = await prisma.job.updateMany({
    where: {
      isActive: true,
      lastSeenAt: { lt: new Date(now - 21 * 24 * 60 * 60 * 1000) },
      source: { not: "manual" },
    },
    data: { isActive: false },
  });

  // Hard delete: inactive jobs with no tracker entries and not seen in 60 days.
  // Jobs saved to a tracker are left alone — just hidden from listings.
  const { count: deleted } = await prisma.job.deleteMany({
    where: {
      isActive: false,
      lastSeenAt: { lt: new Date(now - 60 * 24 * 60 * 60 * 1000) },
      source: { not: "manual" },
      applications: { none: {} },
    },
  });

  return { deactivated, deleted };
}
