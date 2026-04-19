import { load } from "cheerio";
import type { Company } from "@prisma/client";
import { prisma } from "@/lib/db";
import { detectSourceFromUrl } from "@/lib/source-detection";

type DiscoveredSource = {
  sourceType: string;
  sourceToken: string;
  careersUrl?: string;
  matchedUrl: string;
};

type DiscoverySummary = {
  company: string;
  discovered: boolean;
  sourceType: string | null;
  sourceToken: string | null;
  checkedUrls: string[];
  error?: string;
};

const DEFAULT_PATHS = [
  "/careers",
  "/careers/",
  "/jobs",
  "/jobs/",
  "/company/careers",
  "/work-with-us",
  "/join-us",
  "/about/careers",
  "/careers/jobs",
];

function normalizeUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function buildCandidatePages(company: Pick<Company, "websiteUrl" | "careersUrl">) {
  const direct = uniqueStrings([normalizeUrl(company.careersUrl), normalizeUrl(company.websiteUrl)]);
  const website = normalizeUrl(company.websiteUrl);
  if (!website) return direct;
  const probes = DEFAULT_PATHS.map((path) => {
    try {
      return new URL(path, website).toString();
    } catch {
      return null;
    }
  });
  return uniqueStrings([...direct, ...probes]);
}

function scoreDetectedUrl(candidateUrl: string, pageUrl: string) {
  const lower = `${candidateUrl} ${pageUrl}`.toLowerCase();
  let score = 0;
  if (/careers|jobs|positions|join-us|work-with-us/.test(lower)) score += 4;
  if (/greenhouse|lever|ashby|workable|recruitee/.test(lower)) score += 5;
  if (/apply|posting|job-board/.test(lower)) score += 2;
  return score;
}

function parseAtsProviders(raw?: string | null) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function persistDiscovery(company: Company, sourceType: string, sourceToken: string, careersUrl?: string | null) {
  await prisma.company.update({
    where: { id: company.id },
    data: {
      careersUrl: careersUrl || company.careersUrl,
      sourceType,
      sourceToken,
      atsProviders: JSON.stringify(Array.from(new Set([...parseAtsProviders(company.atsProviders), sourceType]))),
    },
  });
}

function detectSourceInHtml(html: string, pageUrl: string): DiscoveredSource | null {
  const $ = load(html);
  const urls = new Set<string>();

  const addCandidate = (raw?: string | null) => {
    if (!raw) return;
    try {
      urls.add(new URL(raw, pageUrl).toString());
    } catch {
      // ignore malformed urls
    }
  };

  $("a[href], iframe[src], script[src], link[href], form[action]").each((_: number, node: any) => {
    addCandidate($(node).attr("href") || $(node).attr("src") || $(node).attr("action"));
  });

  const embeddedMatches = html.match(/https?:\/\/[^"'\s)<>]+/g) ?? [];
  for (const match of embeddedMatches) addCandidate(match);

  let best: (DiscoveredSource & { score: number }) | null = null;
  for (const url of urls) {
    const detected = detectSourceFromUrl(url);
    if (!detected.sourceType || !detected.sourceToken) continue;
    const scored = {
      sourceType: detected.sourceType,
      sourceToken: detected.sourceToken,
      careersUrl: pageUrl,
      matchedUrl: url,
      score: scoreDetectedUrl(url, pageUrl),
    };
    if (!best || scored.score > best.score) best = scored;
  }

  if (!best) return null;
  return {
    sourceType: best.sourceType,
    sourceToken: best.sourceToken,
    careersUrl: best.careersUrl,
    matchedUrl: best.matchedUrl,
  };
}

async function discoverSourceForCompany(company: Company): Promise<DiscoverySummary> {
  const checkedUrls: string[] = [];
  let lastError: string | undefined;

  const directlyConfigured = company.careersUrl
    ? detectSourceFromUrl(company.careersUrl)
    : { sourceType: undefined, sourceToken: undefined };
  if (directlyConfigured.sourceType && directlyConfigured.sourceToken) {
    if (company.sourceType !== directlyConfigured.sourceType || company.sourceToken !== directlyConfigured.sourceToken) {
      await persistDiscovery(company, directlyConfigured.sourceType, directlyConfigured.sourceToken, company.careersUrl);
      return {
        company: company.name,
        discovered: true,
        sourceType: directlyConfigured.sourceType,
        sourceToken: directlyConfigured.sourceToken,
        checkedUrls,
      };
    }

    return {
      company: company.name,
      discovered: false,
      sourceType: directlyConfigured.sourceType,
      sourceToken: directlyConfigured.sourceToken,
      checkedUrls,
    };
  }

  const candidates = buildCandidatePages(company);
  for (const candidate of candidates) {
    checkedUrls.push(candidate);
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "JobFinder/1.0",
        },
        redirect: "follow",
        cache: "no-store",
      });

      if (!response.ok) continue;
      const finalUrl = response.url || candidate;
      const direct = detectSourceFromUrl(finalUrl);
      if (direct.sourceType && direct.sourceToken) {
        await persistDiscovery(company, direct.sourceType, direct.sourceToken, finalUrl);
        return {
          company: company.name,
          discovered: true,
          sourceType: direct.sourceType,
          sourceToken: direct.sourceToken,
          checkedUrls,
        };
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("html")) continue;
      const html = await response.text();
      const embedded = detectSourceInHtml(html, finalUrl);
      if (embedded) {
        await persistDiscovery(company, embedded.sourceType, embedded.sourceToken, embedded.careersUrl || finalUrl);
        return {
          company: company.name,
          discovered: true,
          sourceType: embedded.sourceType,
          sourceToken: embedded.sourceToken,
          checkedUrls,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown discovery error";
    }
  }

  return {
    company: company.name,
    discovered: false,
    sourceType: null,
    sourceToken: null,
    checkedUrls,
    error: lastError,
  };
}

export type DiscoveryProgressEvent = {
  index: number;
  total: number;
  company: string;
  result: DiscoverySummary;
};

export async function discoverSourcesForCompanies(
  companies: Company[],
  onProgress?: (event: DiscoveryProgressEvent) => void,
) {
  const summary: DiscoverySummary[] = [];
  for (let i = 0; i < companies.length; i++) {
    const row = await discoverSourceForCompany(companies[i]);
    summary.push(row);
    onProgress?.({ index: i, total: companies.length, company: companies[i].name, result: row });
  }
  return summary;
}

export async function discoverSourcesForAllCompanies(options?: {
  includeConfigured?: boolean;
  onProgress?: (event: DiscoveryProgressEvent) => void;
}) {
  const companies = await prisma.company.findMany({
    where: options?.includeConfigured
      ? { activeHiring: true }
      : {
          activeHiring: true,
          OR: [{ sourceType: null }, { sourceToken: null }],
        },
  });
  return discoverSourcesForCompanies(companies, options?.onProgress);
}
