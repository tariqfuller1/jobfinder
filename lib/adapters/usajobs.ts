import { inferEmploymentType, inferExperienceLevel, inferWorkplaceType, parseTags } from "@/lib/normalize";
import type { NormalizedJob } from "@/types/jobs";

type UsaJobsItem = {
  MatchedObjectId?: string;
  PositionID?: string;
  PositionTitle?: string;
  PositionURI?: string;
  ApplyURI?: string[];
  ApplyURIArray?: string[];
  OrganizationName?: string;
  DepartmentName?: string;
  PositionLocation?: Array<{ LocationName?: string }>;
  PositionLocationDisplay?: string;
  PositionLocationWithinArea?: string;
  QualificationSummary?: string;
  JobSummary?: string;
  PositionFormattedDescription?: Array<{ Content?: string }>;
  UserArea?: {
    Details?: {
      MajorDuties?: string[] | string;
      JobSummary?: string;
      LowGrade?: string;
      HighGrade?: string;
      PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string }>;
      TeleworkEligible?: boolean;
      RemoteIndicator?: boolean;
      Locations?: string[];
    };
  };
  PositionSchedule?: Array<{ Name?: string }>;
  PositionOfferingType?: Array<{ Name?: string }>;
  JobGrade?: Array<{ Code?: string }>; 
  PublicationStartDate?: string;
  ApplicationCloseDate?: string;
};

type UsaJobsResponse = {
  SearchResult?: {
    SearchResultItems?: Array<{
      MatchedObjectDescriptor?: UsaJobsItem;
    }>;
  };
};

function asList(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

export async function fetchUsaJobs(): Promise<NormalizedJob[]> {
  const apiKey = process.env.USAJOBS_API_KEY?.trim();
  const userAgent = process.env.USAJOBS_USER_AGENT_EMAIL?.trim();
  if (!apiKey || !userAgent) {
    return [];
  }

  const keywords = (process.env.USAJOBS_KEYWORDS || "software engineer,developer,programmer,applications software")
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean);

  const jobs: NormalizedJob[] = [];
  const seenIds = new Set<string>();

  for (const keyword of keywords) {
    const url = new URL("https://data.usajobs.gov/api/search");
    url.searchParams.set("Keyword", keyword);
    url.searchParams.set("ResultsPerPage", process.env.USAJOBS_RESULTS_PER_PAGE || "250");

    const response = await fetch(url.toString(), {
      headers: {
        Host: "data.usajobs.gov",
        "User-Agent": userAgent,
        "Authorization-Key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`USAJOBS fetch failed for keyword ${keyword}: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as UsaJobsResponse;
    const rows = payload.SearchResult?.SearchResultItems ?? [];

    for (const row of rows) {
      const item = row.MatchedObjectDescriptor;
      if (!item?.PositionTitle || !item.PositionURI) continue;
      const externalId = item.MatchedObjectId || item.PositionID || item.PositionURI;
      if (seenIds.has(externalId)) continue;
      seenIds.add(externalId);

      const location =
        item.PositionLocationDisplay ||
        item.PositionLocationWithinArea ||
        item.PositionLocation?.map((entry) => entry.LocationName).filter(Boolean).join(", ") ||
        item.UserArea?.Details?.Locations?.filter(Boolean).join(", ") ||
        null;

      const offeringTypes = (item.PositionOfferingType ?? []).map((entry) => entry.Name).filter(Boolean) as string[];
      const scheduleTypes = (item.PositionSchedule ?? []).map((entry) => entry.Name).filter(Boolean) as string[];
      const formattedDescription = (item.PositionFormattedDescription ?? []).map((entry) => entry.Content).filter(Boolean) as string[];
      const majorDuties = asList(item.UserArea?.Details?.MajorDuties);
      const descriptionText = [
        item.JobSummary,
        item.QualificationSummary,
        item.UserArea?.Details?.JobSummary,
        ...majorDuties,
        ...formattedDescription,
      ]
        .filter(Boolean)
        .join("\n\n");
      const workplaceHints = [
        item.UserArea?.Details?.TeleworkEligible ? "telework" : "",
        item.UserArea?.Details?.RemoteIndicator ? "remote" : "",
        location ?? "",
      ].join(" ");
      const tagText = [
        item.OrganizationName,
        item.DepartmentName,
        ...offeringTypes,
        ...scheduleTypes,
        ...(item.JobGrade ?? []).map((entry) => entry.Code).filter(Boolean) as string[],
      ].filter(Boolean);

      jobs.push({
        externalId,
        source: "usajobs",
        sourceUrl: item.PositionURI,
        applyUrl: item.ApplyURI?.[0] || item.ApplyURIArray?.[0] || item.PositionURI,
        title: item.PositionTitle,
        company: item.OrganizationName || item.DepartmentName || "USAJOBS",
        location,
        workplaceType: inferWorkplaceType(workplaceHints),
        employmentType: inferEmploymentType([...offeringTypes, ...scheduleTypes].join(" ")),
        experienceLevel: inferExperienceLevel([item.PositionTitle, descriptionText, ...(item.JobGrade ?? []).map((entry) => entry.Code).filter(Boolean) as string[]].join(" ")),
        descriptionHtml: null,
        descriptionText: descriptionText || null,
        postedAt: item.PublicationStartDate ? new Date(item.PublicationStartDate) : null,
        tags: parseTags(...tagText),
      } satisfies NormalizedJob);
    }
  }

  return jobs;
}
