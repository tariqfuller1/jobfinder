import { defaultUserProfile, type UserProfile } from "@/lib/profile";
import type { CompanyCategory, CompanyRemotePolicy, ExperienceLevel, WorkplaceType } from "@prisma/client";

type MatchResult = {
  score: number;
  reasons: string[];
};

function includesAny(text: string, values: string[]) {
  const lower = text.toLowerCase();
  return values.filter((value) => lower.includes(value.toLowerCase()));
}

function normalizeBlob(parts: Array<string | null | undefined | string[]>) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string => Boolean(part))
    .join(" | ")
    .toLowerCase();
}

export function scoreCompanyFit(
  company: {
    name: string;
    headquarters?: string | null;
    locations?: string[];
    remotePolicy: CompanyRemotePolicy | string;
    companyCategory: CompanyCategory | string;
    stackTags?: string[];
    gameTags?: string[];
    roleFocusTags?: string[];
    industryTags?: string[];
    notes?: string | null;
    outreachTips?: string | null;
    activeHiring?: boolean;
    openJobCount?: number;
  },
  profile: UserProfile = defaultUserProfile,
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  // Structured tags only — prose fields like notes/outreachTips can produce false skill hits.
  const structuredText = normalizeBlob([
    company.name,
    company.stackTags ?? [],
    company.gameTags ?? [],
    company.roleFocusTags ?? [],
    company.industryTags ?? [],
  ]);

  const skillHits = includesAny(structuredText, profile.skills);
  if (skillHits.length) {
    score += Math.min(50, skillHits.length * 10);
    reasons.push(`Skill overlap: ${skillHits.slice(0, 4).join(", ")}`);
  }

  const titleHits = includesAny(structuredText, profile.targetTitles);
  if (titleHits.length) {
    score += Math.min(35, titleHits.length * 12);
    reasons.push(`Target role match: ${titleHits.slice(0, 3).join(", ")}`);
  }

  // Location check against headquarters/offices only — not notes or other prose fields.
  const locText = normalizeBlob([company.headquarters, company.locations ?? []]);
  const locationHits = profile.preferredLocations.filter((loc) =>
    locText.includes(loc.toLowerCase()),
  );
  if (locationHits.length) {
    score += 20;
    reasons.push(`Location fit: ${locationHits[0]}`);
  }

  if (company.remotePolicy === "REMOTE_FRIENDLY" || company.remotePolicy === "FLEXIBLE") {
    score += 15;
    reasons.push("Remote-friendly or flexible hiring setup");
  }

  if (company.companyCategory === "GAMING" || company.companyCategory === "BOTH") {
    score += 12;
    reasons.push("Strong game-tech relevance");
  }

  if (company.activeHiring) {
    score += 10;
    reasons.push("Marked as actively hiring");
  }

  if ((company.openJobCount ?? 0) > 0) {
    score += Math.min(20, (company.openJobCount ?? 0) * 2);
    reasons.push(`${company.openJobCount} open job${company.openJobCount === 1 ? "" : "s"} in your feed`);
  }

  return { score, reasons: reasons.slice(0, 4) };
}

export function scoreJobFit(
  job: {
    title: string;
    company: string;
    location?: string | null;
    workplaceType: WorkplaceType | string;
    experienceLevel: ExperienceLevel | string;
    tags?: string[];
    descriptionText?: string | null;
    companyCategory?: string | null;
  },
  profile: UserProfile = defaultUserProfile,
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  // Title/skill matching: only structured fields (title + tags), never description.
  // Descriptions are prose and cause false positives — "unity of purpose" matching
  // the Unity skill, or a cooking job's description mentioning "react to feedback".
  const structuredText = normalizeBlob([job.title, job.company, job.tags ?? []]);

  const titleHits = includesAny(structuredText, profile.targetTitles);
  if (titleHits.length) {
    score += Math.min(50, titleHits.length * 15);
    reasons.push(`Title match: ${titleHits.slice(0, 3).join(", ")}`);
  }

  const skillHits = includesAny(structuredText, profile.skills);
  if (skillHits.length) {
    score += Math.min(50, skillHits.length * 10);
    reasons.push(`Skill overlap: ${skillHits.slice(0, 4).join(", ")}`);
  }

  // Location matching: ONLY check job.location, never the description.
  // A Serbia job whose description says "remote-friendly" must not match "Remote US".
  const locationText = (job.location ?? "").toLowerCase();
  const locationHits = profile.preferredLocations.filter((loc) =>
    locationText.includes(loc.toLowerCase()),
  );
  if (locationHits.length) {
    score += 20;
    reasons.push(`Location fit: ${locationHits[0]}`);
  }

  // Remote/hybrid bonus is separate from location — it applies regardless of geography.
  if (job.workplaceType === "REMOTE") {
    score += 15;
    reasons.push("Remote role");
  } else if (job.workplaceType === "HYBRID") {
    score += 12;
    reasons.push("Hybrid role");
  }

  if (job.experienceLevel === "ENTRY" || job.experienceLevel === "INTERN") {
    score += 18;
    reasons.push("Good level for early-career applications");
  }

  if (job.companyCategory === "GAMING" || job.companyCategory === "BOTH") {
    score += 10;
    reasons.push("Gaming-adjacent company match");
  }

  return { score, reasons: reasons.slice(0, 4) };
}

export function buildLinkedInSearchUrl(query: string) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

export function buildGoogleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function suggestContactSearches(
  company: { name: string; headquarters?: string | null; companyCategory: string; roleFocusTags?: string[] },
  profile: UserProfile = defaultUserProfile,
) {
  const city = company.headquarters?.split(",")[0]?.trim();
  const baseRoles = [
    "recruiter software engineer",
    "talent acquisition engineering",
    "engineering manager",
    "hiring manager software engineer",
    "university recruiter",
  ];

  if (company.companyCategory === "GAMING" || company.companyCategory === "BOTH") {
    baseRoles.push("gameplay engineer recruiter", "gameplay engineering manager", "tools engineer recruiter");
  }

  if ((company.roleFocusTags ?? []).some((tag) => /frontend|full stack|react/i.test(tag))) {
    baseRoles.push("frontend engineering manager", "product engineer recruiter");
  }

  const profileRoleAdds = profile.contactRoleTargets.slice(0, 3).map((role) => role.toLowerCase());

  return [...new Set([...baseRoles, ...profileRoleAdds])].slice(0, 7).map((role) => {
    const query = `${company.name} ${role}${city ? ` ${city}` : ""}`;
    return {
      label: role,
      query,
      linkedinUrl: buildLinkedInSearchUrl(query),
      googleUrl: buildGoogleSearchUrl(`${query} LinkedIn`),
    };
  });
}

export function suggestConnectionSearches(
  company: { name: string; headquarters?: string | null },
  profile: UserProfile = defaultUserProfile,
) {
  const city = company.headquarters?.split(",")[0]?.trim();

  const alumniSearches = profile.schoolKeywords.slice(0, 4).map((keyword) => ({
    label: `${keyword} connection`,
    query: `${company.name} ${keyword}${city ? ` ${city}` : ""}`,
  }));

  const employerSearches = profile.companiesWorked.slice(0, 3).map((keyword) => ({
    label: `${keyword} overlap`,
    query: `${company.name} ${keyword} engineering`,
  }));

  const skillSearches = profile.skills.slice(0, 3).map((keyword) => ({
    label: `${keyword} team search`,
    query: `${company.name} ${keyword} recruiter engineer`,
  }));

  return [...alumniSearches, ...employerSearches, ...skillSearches].slice(0, 8).map((search) => ({
    ...search,
    linkedinUrl: buildLinkedInSearchUrl(search.query),
    googleUrl: buildGoogleSearchUrl(`${search.query} LinkedIn`),
  }));
}

export function buildOutreachMessage(
  input: { companyName: string; role?: string | null; focusTags?: string[]; notes?: string | null },
  profile: UserProfile = defaultUserProfile,
) {
  const focus = input.focusTags?.slice(0, 3).join(", ") || "software and gameplay systems";
  const role = input.role ? ` for ${input.role}` : "";
  return `Hi [Name],\n\nI’m reaching out because I’m very interested in ${input.companyName}${role}. I recently built a Unity precision platformer focused on responsive movement, dash, grappling, and combat systems, and I also have experience building user-focused React interfaces from my HCI and web work. ${input.notes ? `${input.notes} ` : ""}The work your team does around ${focus} feels especially aligned with my background.\n\nI’d love to connect and learn more about the team and where someone with my mix of gameplay, frontend, and product-minded engineering experience could contribute.\n\nThank you,\n${profile.name}`;
}
