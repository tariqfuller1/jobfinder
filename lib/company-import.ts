import { CompanyCategory, CompanyRemotePolicy, type Company } from "@prisma/client";
import { prisma } from "@/lib/db";
import { filterSoftwareJobs } from "@/lib/filtering";
import { fetchAshbyJobs } from "@/lib/adapters/ashby";
import { fetchGamesWorkbookJobs } from "@/lib/adapters/gamesWorkbook";
import { fetchGreenhouseJobs } from "@/lib/adapters/greenhouse";
import { fetchLeverJobs } from "@/lib/adapters/lever";
import { fetchRecruiteeJobs } from "@/lib/adapters/recruitee";
import { fetchRemotiveJobs } from "@/lib/adapters/remotive";
import { fetchWorkableJobs } from "@/lib/adapters/workable";
import type { NormalizedJob } from "@/types/jobs";
import { discoverSourcesForCompanies } from "@/lib/source-discovery";
import { detectSourceFromUrl } from "@/lib/source-detection";

type ImportRow = Record<string, string>;

type CompanyImportInput = {
  name: string;
  slug?: string;
  websiteUrl?: string;
  careersUrl?: string;
  headquarters?: string;
  hiringRegions?: string[];
  locations?: string[];
  remotePolicy?: CompanyRemotePolicy;
  companyCategory?: CompanyCategory;
  companySize?: string;
  stackTags?: string[];
  gameTags?: string[];
  roleFocusTags?: string[];
  industryTags?: string[];
  hiringSignals?: string[];
  atsProviders?: string[];
  emailPatterns?: string[];
  linkedinUrl?: string;
  notes?: string;
  outreachTips?: string;
  activeHiring?: boolean;
  sourceType?: string;
  sourceToken?: string;
};

const SUPPORTED_SOURCE_TYPES = new Set(["GREENHOUSE", "LEVER", "ASHBY", "WORKABLE", "RECRUITEE", "REMOTIVE", "GAMES_WORKBOOK"]);

function splitMultiValue(value?: string) {
  if (!value) return [];
  return value
    .split(/\||;|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function parseBoolean(value?: string) {
  if (!value) return undefined;
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

function parseCategory(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "SOFTWARE" || normalized === "GAMING" || normalized === "BOTH") return normalized as CompanyCategory;
  return undefined;
}

function parseRemotePolicy(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["REMOTE_FRIENDLY", "HYBRID", "ONSITE", "FLEXIBLE", "UNKNOWN"].includes(normalized)) return normalized as CompanyRemotePolicy;
  return undefined;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((item) => item.replace(/^"|"$/g, ""));
}

export function parseCompaniesCsv(csvText: string): ImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: ImportRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

export { detectSourceFromUrl };

function buildCompanyInput(row: ImportRow): CompanyImportInput | null {
  const name = row.name?.trim();
  if (!name) return null;

  const explicitSourceType = row.sourceType?.trim().toUpperCase();
  const explicitSourceToken = row.sourceToken?.trim();
  const detected = detectSourceFromUrl(row.careersUrl || row.websiteUrl);
  const sourceType = explicitSourceType && SUPPORTED_SOURCE_TYPES.has(explicitSourceType) ? explicitSourceType : detected.sourceType;
  const sourceToken = explicitSourceToken || detected.sourceToken;

  return {
    name,
    slug: row.slug?.trim() || slugify(name),
    websiteUrl: row.websiteUrl?.trim() || undefined,
    careersUrl: row.careersUrl?.trim() || undefined,
    headquarters: row.headquarters?.trim() || undefined,
    hiringRegions: splitMultiValue(row.hiringRegions),
    locations: splitMultiValue(row.locations || row.headquarters),
    remotePolicy: parseRemotePolicy(row.remotePolicy),
    companyCategory: parseCategory(row.companyCategory),
    companySize: row.companySize?.trim() || undefined,
    stackTags: splitMultiValue(row.stackTags),
    gameTags: splitMultiValue(row.gameTags),
    roleFocusTags: splitMultiValue(row.roleFocusTags),
    industryTags: splitMultiValue(row.industryTags),
    hiringSignals: splitMultiValue(row.hiringSignals),
    atsProviders: Array.from(new Set([...(splitMultiValue(row.atsProviders)), ...(sourceType ? [sourceType] : [])])),
    emailPatterns: splitMultiValue(row.emailPatterns),
    linkedinUrl: row.linkedinUrl?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
    outreachTips: row.outreachTips?.trim() || undefined,
    activeHiring: parseBoolean(row.activeHiring) ?? true,
    sourceType,
    sourceToken: sourceToken || undefined,
  };
}

async function upsertImportedCompany(input: CompanyImportInput) {
  return prisma.company.upsert({
    where: { slug: input.slug! },
    create: {
      name: input.name,
      slug: input.slug!,
      websiteUrl: input.websiteUrl,
      careersUrl: input.careersUrl,
      headquarters: input.headquarters,
      hiringRegions: JSON.stringify(input.hiringRegions ?? []),
      locations: JSON.stringify(input.locations ?? []),
      remotePolicy: input.remotePolicy ?? CompanyRemotePolicy.UNKNOWN,
      companyCategory: input.companyCategory ?? CompanyCategory.SOFTWARE,
      companySize: input.companySize,
      stackTags: JSON.stringify(input.stackTags ?? []),
      gameTags: JSON.stringify(input.gameTags ?? []),
      roleFocusTags: JSON.stringify(input.roleFocusTags ?? []),
      industryTags: JSON.stringify(input.industryTags ?? []),
      hiringSignals: JSON.stringify(input.hiringSignals ?? []),
      atsProviders: JSON.stringify(input.atsProviders ?? []),
      emailPatterns: JSON.stringify(input.emailPatterns ?? []),
      notes: input.notes,
      outreachTips: input.outreachTips,
      linkedinUrl: input.linkedinUrl,
      activeHiring: input.activeHiring ?? true,
      sourceType: input.sourceType,
      sourceToken: input.sourceToken,
    },
    update: {
      name: input.name,
      websiteUrl: input.websiteUrl,
      careersUrl: input.careersUrl,
      headquarters: input.headquarters,
      hiringRegions: JSON.stringify(input.hiringRegions ?? []),
      locations: JSON.stringify(input.locations ?? []),
      remotePolicy: input.remotePolicy ?? CompanyRemotePolicy.UNKNOWN,
      companyCategory: input.companyCategory ?? CompanyCategory.SOFTWARE,
      companySize: input.companySize,
      stackTags: JSON.stringify(input.stackTags ?? []),
      gameTags: JSON.stringify(input.gameTags ?? []),
      roleFocusTags: JSON.stringify(input.roleFocusTags ?? []),
      industryTags: JSON.stringify(input.industryTags ?? []),
      hiringSignals: JSON.stringify(input.hiringSignals ?? []),
      atsProviders: JSON.stringify(input.atsProviders ?? []),
      emailPatterns: JSON.stringify(input.emailPatterns ?? []),
      notes: input.notes,
      outreachTips: input.outreachTips,
      linkedinUrl: input.linkedinUrl,
      activeHiring: input.activeHiring ?? true,
      sourceType: input.sourceType,
      sourceToken: input.sourceToken,
    },
  });
}

function mergeCompanyIntoJobs(company: Company, jobs: NormalizedJob[]) {
  return jobs.map((job) => ({
    ...job,
    company: company.name,
    location: job.location ?? company.headquarters ?? null,
    sourceUrl: job.sourceUrl || company.careersUrl || company.websiteUrl || job.applyUrl,
    applyUrl: job.applyUrl || company.careersUrl || company.websiteUrl || job.sourceUrl,
  }));
}

async function fetchJobsForCompany(company: Company): Promise<NormalizedJob[]> {
  const sourceType = company.sourceType?.toUpperCase();
  const sourceToken = company.sourceToken?.trim();

  if (sourceType === "REMOTIVE") {
    const all = await fetchRemotiveJobs();
    return all.filter((job) => job.company.toLowerCase() === company.name.toLowerCase() || job.title.toLowerCase().includes(company.name.toLowerCase()));
  }

  if (sourceType === "GAMES_WORKBOOK") {
    const all = await fetchGamesWorkbookJobs();
    return all.filter((job) => job.company.toLowerCase() === company.name.toLowerCase() || job.applyUrl.toLowerCase().includes(company.slug));
  }

  if (!sourceType || !sourceToken) return [];

  switch (sourceType) {
    case "GREENHOUSE":
      return fetchGreenhouseJobs(sourceToken);
    case "LEVER":
      return fetchLeverJobs(sourceToken);
    case "ASHBY":
      return fetchAshbyJobs(sourceToken);
    case "WORKABLE":
      return fetchWorkableJobs(sourceToken);
    case "RECRUITEE":
      return fetchRecruiteeJobs(sourceToken);
    default:
      return [];
  }
}

async function upsertJob(job: NormalizedJob) {
  await prisma.job.upsert({
    where: {
      source_externalId: {
        source: job.source,
        externalId: job.externalId,
      },
    },
    create: {
      ...job,
      tags: JSON.stringify(job.tags),
      lastSeenAt: new Date(),
      isActive: true,
    },
    update: {
      ...job,
      tags: JSON.stringify(job.tags),
      lastSeenAt: new Date(),
      isActive: true,
    },
  });
}

export async function bulkImportCompaniesFromCsv(csvText: string) {
  const rows = parseCompaniesCsv(csvText);
  const importedCompanies: Company[] = [];
  for (const row of rows) {
    const input = buildCompanyInput(row);
    if (!input) continue;
    const company = await upsertImportedCompany(input);
    importedCompanies.push(company);
  }
  return importedCompanies;
}

export type CompanySyncProgressEvent = {
  index: number;
  total: number;
  company: string;
  jobsImported: number;
  skipped: boolean;
  error?: string;
};

export async function syncJobsForCompanies(
  companies: Company[],
  onProgress?: (event: CompanySyncProgressEvent) => void,
) {
  const softwareOnly = (process.env.SOFTWARE_ONLY ?? "true").toLowerCase() === "true";
  const summary: Array<{ company: string; sourceType: string | null; sourceToken: string | null; jobsFetched: number; jobsImported: number; skipped: boolean; error?: string }> = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    if (!company.sourceType && !company.sourceToken) {
      summary.push({ company: company.name, sourceType: null, sourceToken: null, jobsFetched: 0, jobsImported: 0, skipped: true, error: "No supported source configured" });
      onProgress?.({ index: i, total: companies.length, company: company.name, jobsImported: 0, skipped: true });
      continue;
    }

    try {
      let jobs = await fetchJobsForCompany(company);
      jobs = mergeCompanyIntoJobs(company, softwareOnly ? filterSoftwareJobs(jobs) : jobs);
      let imported = 0;
      for (const job of jobs) {
        await upsertJob(job);
        imported += 1;
      }
      summary.push({ company: company.name, sourceType: company.sourceType, sourceToken: company.sourceToken, jobsFetched: jobs.length, jobsImported: imported, skipped: false });
      onProgress?.({ index: i, total: companies.length, company: company.name, jobsImported: imported, skipped: false });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      summary.push({ company: company.name, sourceType: company.sourceType, sourceToken: company.sourceToken, jobsFetched: 0, jobsImported: 0, skipped: false, error: msg });
      onProgress?.({ index: i, total: companies.length, company: company.name, jobsImported: 0, skipped: false, error: msg });
    }
  }

  return summary;
}

export async function importCompaniesAndSync(csvText: string) {
  const importedCompanies = await bulkImportCompaniesFromCsv(csvText);
  const discoverySummary = await discoverSourcesForCompanies(importedCompanies);
  const refreshedCompanies = await prisma.company.findMany({
    where: {
      id: { in: importedCompanies.map((company) => company.id) },
    },
  });
  const syncSummary = await syncJobsForCompanies(refreshedCompanies);
  return {
    importedCount: importedCompanies.length,
    syncedCount: syncSummary.filter((item) => !item.skipped).length,
    importedCompanies: refreshedCompanies,
    discoverySummary,
    syncSummary,
  };
}
