import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { defaultUserProfile, type UserProfile } from "@/lib/profile";
import { buildOutreachMessage, scoreCompanyFit, scoreJobFit, suggestConnectionSearches, suggestContactSearches } from "@/lib/recommendations";
import { resolveJobLinks } from "@/lib/job-links";

export type CompanyFilters = {
  q?: string;
  category?: string;
  remotePolicy?: string;
  location?: string;
  size?: string;
  skill?: string;
  state?: string;
  ats?: string;
  activeHiring?: string;
  page?: number;
  limit?: number;
};

function parseJsonArray(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalizeCompanyRow(company: Awaited<ReturnType<typeof prisma.company.findFirst>>) {
  if (!company) return null;
  return {
    ...company,
    hiringRegions: parseJsonArray(company.hiringRegions),
    locations: parseJsonArray(company.locations),
    stackTags: parseJsonArray(company.stackTags),
    gameTags: parseJsonArray(company.gameTags),
    roleFocusTags: parseJsonArray(company.roleFocusTags),
    industryTags: parseJsonArray(company.industryTags),
    hiringSignals: parseJsonArray(company.hiringSignals),
    atsProviders: parseJsonArray(company.atsProviders),
    emailPatterns: parseJsonArray(company.emailPatterns),
  };
}

function companyNameVariants(name: string) {
  const lower = name.trim().toLowerCase();
  return [lower, lower.replace(/\s+/g, ""), lower.replace(/[^a-z0-9]/g, "")];
}

let _jobCountsCache: { data: Map<string, number>; expires: number } | null = null;
const JOB_COUNTS_TTL_MS = 60_000;

async function getOpenJobCountsByCompany() {
  if (_jobCountsCache && _jobCountsCache.expires > Date.now()) {
    return _jobCountsCache.data;
  }
  // groupBy fetches only counts per company name, not all job rows
  const groups = await prisma.job.groupBy({
    by: ["company"],
    where: { isActive: true },
    _count: { company: true },
  });
  const counts = new Map<string, number>();
  for (const group of groups) {
    const n = group._count.company;
    for (const variant of companyNameVariants(group.company)) {
      counts.set(variant, Math.max(counts.get(variant) ?? 0, n));
    }
  }
  _jobCountsCache = { data: counts, expires: Date.now() + JOB_COUNTS_TTL_MS };
  return counts;
}

export async function listCompanies(filters: CompanyFilters, profile: UserProfile = defaultUserProfile) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 24;

  const where: Prisma.CompanyWhereInput = {
    AND: [
      filters.q
        ? {
            OR: [
              { name: { contains: filters.q } },
              { headquarters: { contains: filters.q } },
              { notes: { contains: filters.q } },
              { outreachTips: { contains: filters.q } },
              { stackTags: { contains: filters.q } },
              { roleFocusTags: { contains: filters.q } },
              { industryTags: { contains: filters.q } },
            ],
          }
        : {},
      filters.category ? { companyCategory: filters.category as never } : {},
      filters.remotePolicy ? { remotePolicy: filters.remotePolicy as never } : {},
      filters.location ? { OR: [{ headquarters: { contains: filters.location } }, { locations: { contains: filters.location } }] } : {},
      filters.state ? { OR: [{ headquarters: { contains: filters.state } }, { locations: { contains: filters.state } }] } : {},
      filters.size ? { companySize: { contains: filters.size } } : {},
      filters.ats ? { atsProviders: { contains: filters.ats } } : {},
      filters.activeHiring === "true" ? { activeHiring: true } : {},
      filters.skill
        ? {
            OR: [
              { stackTags: { contains: filters.skill } },
              { gameTags: { contains: filters.skill } },
              { roleFocusTags: { contains: filters.skill } },
              { industryTags: { contains: filters.skill } },
            ],
          }
        : {},
    ],
  };

  const [rows, total, openJobCounts] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: [{ activeHiring: "desc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      // contacts are only needed on the detail page, skip them in list queries
    }),
    prisma.company.count({ where }),
    getOpenJobCountsByCompany(),
  ]);

  return {
    companies: rows.map((company: any) => {
      const normalized = normalizeCompanyRow(company)!;
      const openJobCount = Math.max(...companyNameVariants(company.name).map((variant) => openJobCounts.get(variant) ?? 0));
      const fit = scoreCompanyFit({ ...normalized, openJobCount }, profile);
      return {
        ...normalized,
        openJobCount,
        fitScore: fit.score,
        fitReasons: fit.reasons,
      };
    }),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getCompanyBySlug(slug: string, profile: UserProfile = defaultUserProfile) {
  const [company] = await Promise.all([
    prisma.company.findUnique({
      where: { slug },
      include: {
        contacts: {
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        },
      },
    }),
  ]);

  if (!company) return null;

  const normalized = {
    ...normalizeCompanyRow(company)!,
    contacts: company.contacts,
  };

  const relatedJobsRaw = await prisma.job.findMany({
    where: {
      isActive: true,
      OR: [{ company: { contains: company.name } }, { company: { contains: company.name.replace(/\s+/g, "") } }],
    },
    orderBy: [{ postedAt: "desc" }, { updatedAt: "desc" }],
    take: 12,
  });

  const relatedJobs = relatedJobsRaw.map((job: any) => {
    const fit = scoreJobFit(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        workplaceType: job.workplaceType,
        experienceLevel: job.experienceLevel,
        tags: parseJsonArray(job.tags),
        descriptionText: job.descriptionText,
        companyCategory: normalized.companyCategory,
      },
      profile,
    );

    return {
      ...job,
      tags: parseJsonArray(job.tags),
      fitScore: fit.score,
      fitReasons: fit.reasons,
      ...resolveJobLinks({
        applyUrl: job.applyUrl,
        sourceUrl: job.sourceUrl,
        companyCareersUrl: normalized.careersUrl,
        companyWebsiteUrl: normalized.websiteUrl,
      }),
    };
  });

  const fit = scoreCompanyFit({ ...normalized, openJobCount: relatedJobs.length }, profile);

  return {
    ...normalized,
    relatedJobs,
    fitScore: fit.score,
    fitReasons: fit.reasons,
    suggestedSearches: suggestContactSearches(normalized, profile),
    connectionSearches: suggestConnectionSearches(normalized, profile),
    outreachMessage: buildOutreachMessage(
      {
        companyName: normalized.name,
        focusTags: [...normalized.stackTags, ...normalized.gameTags, ...normalized.roleFocusTags],
        notes: normalized.outreachTips,
      },
      profile,
    ),
  };
}

export async function listTopCompanyMatches(limit = 8, profile: UserProfile = defaultUserProfile) {
  const { companies } = await listCompanies({ page: 1, limit, activeHiring: "true" }, profile);
  return [...companies].sort((a, b) => b.fitScore - a.fitScore).slice(0, limit);
}
