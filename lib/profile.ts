import { cache } from "react";
import { prisma } from "@/lib/db";

export type RemotePreference = "REMOTE" | "HYBRID" | "ONSITE";
export type TargetCategory = "SOFTWARE" | "GAMING" | "BOTH";

export type ProfileLink = {
  label: string;
  url: string;
};

export type UserProfile = {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  headline: string;
  summary: string;
  preferredLocations: string[];
  preferredStates: string[];
  remotePreference: RemotePreference[];
  targetCategories: TargetCategory[];
  targetTitles: string[];
  skills: string[];
  stacks: string[];
  industries: string[];
  contactRoleTargets: string[];
  educationEntries: string[];
  companiesWorked: string[];
  schoolKeywords: string[];
  connectionKeywords: string[];
  links: ProfileLink[];
  resumeText?: string;
  rawUploadName?: string;
};

export type UserProfileInput = Partial<UserProfile>;

function unique(values: Array<string | undefined | null>) {
  return Array.from(
    new Map(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
        .map((value) => [value.toLowerCase(), value]),
    ).values(),
  );
}

function parseJsonArray(value?: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseLinks(value?: string | null): ProfileLink[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ProfileLink =>
        item && typeof item === "object" &&
        typeof item.label === "string" &&
        typeof item.url === "string",
    );
  } catch {
    return [];
  }
}

export const defaultUserProfile: UserProfile = {
  name: "",
  headline: "",
  summary: "",
  preferredLocations: [],
  preferredStates: [],
  remotePreference: [],
  targetCategories: [],
  targetTitles: [],
  skills: [],
  stacks: [],
  industries: [],
  contactRoleTargets: [],
  educationEntries: [],
  companiesWorked: [],
  schoolKeywords: [],
  connectionKeywords: [],
  links: [],
};

export function createDefaultProfileInputForUser(seed?: { name?: string; email?: string }): UserProfileInput {
  return {
    ...defaultUserProfile,
    name: seed?.name?.trim() || defaultUserProfile.name,
    email: seed?.email?.trim() || undefined,
  };
}

function mergeProfile(profile?: UserProfileInput | null): UserProfile {
  return {
    ...defaultUserProfile,
    ...profile,
    name: profile?.name?.trim() || defaultUserProfile.name,
    headline: profile?.headline?.trim() || defaultUserProfile.headline,
    summary: profile?.summary?.trim() || defaultUserProfile.summary,
    email: profile?.email?.trim() || undefined,
    phone: profile?.phone?.trim() || undefined,
    location: profile?.location?.trim() || undefined,
    preferredLocations: unique(profile?.preferredLocations ?? defaultUserProfile.preferredLocations),
    preferredStates: unique(profile?.preferredStates ?? defaultUserProfile.preferredStates),
    remotePreference:
      (profile?.remotePreference?.length ? profile.remotePreference : defaultUserProfile.remotePreference) as RemotePreference[],
    targetCategories:
      (profile?.targetCategories?.length ? profile.targetCategories : defaultUserProfile.targetCategories) as TargetCategory[],
    targetTitles: unique(profile?.targetTitles ?? defaultUserProfile.targetTitles),
    skills: unique(profile?.skills ?? defaultUserProfile.skills),
    stacks: unique(profile?.stacks ?? defaultUserProfile.stacks),
    industries: unique(profile?.industries ?? defaultUserProfile.industries),
    contactRoleTargets: unique(profile?.contactRoleTargets ?? defaultUserProfile.contactRoleTargets),
    educationEntries: unique(profile?.educationEntries ?? defaultUserProfile.educationEntries),
    companiesWorked: unique(profile?.companiesWorked ?? defaultUserProfile.companiesWorked),
    schoolKeywords: unique(profile?.schoolKeywords ?? defaultUserProfile.schoolKeywords),
    connectionKeywords: unique(profile?.connectionKeywords ?? defaultUserProfile.connectionKeywords),
    links: profile?.links ?? defaultUserProfile.links,
    resumeText: profile?.resumeText,
    rawUploadName: profile?.rawUploadName,
  };
}

function serializeProfile(profile: UserProfile, userId: string) {
  return {
    userId,
    isActive: true,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    headline: profile.headline,
    summary: profile.summary,
    resumeText: profile.resumeText,
    rawUploadName: profile.rawUploadName,
    preferredLocations: JSON.stringify(profile.preferredLocations),
    preferredStates: JSON.stringify(profile.preferredStates),
    remotePreference: JSON.stringify(profile.remotePreference),
    targetCategories: JSON.stringify(profile.targetCategories),
    targetTitles: JSON.stringify(profile.targetTitles),
    skills: JSON.stringify(profile.skills),
    stacks: JSON.stringify(profile.stacks),
    industries: JSON.stringify(profile.industries),
    contactRoleTargets: JSON.stringify(profile.contactRoleTargets),
    educationEntries: JSON.stringify(profile.educationEntries),
    companiesWorked: JSON.stringify(profile.companiesWorked),
    schoolKeywords: JSON.stringify(profile.schoolKeywords),
    connectionKeywords: JSON.stringify(profile.connectionKeywords),
    links: JSON.stringify(profile.links),
  };
}

type CandidateProfileRecord = Awaited<ReturnType<typeof prisma.candidateProfile.findFirst>>;

function normalizeRecord(record: CandidateProfileRecord): UserProfile {
  if (!record) return defaultUserProfile;

  return mergeProfile({
    name: record.name ?? undefined,
    email: record.email ?? undefined,
    phone: record.phone ?? undefined,
    location: record.location ?? undefined,
    headline: record.headline ?? undefined,
    summary: record.summary ?? undefined,
    resumeText: record.resumeText ?? undefined,
    rawUploadName: record.rawUploadName ?? undefined,
    preferredLocations: parseJsonArray(record.preferredLocations),
    preferredStates: parseJsonArray(record.preferredStates),
    remotePreference: parseJsonArray(record.remotePreference) as RemotePreference[],
    targetCategories: parseJsonArray(record.targetCategories) as TargetCategory[],
    targetTitles: parseJsonArray(record.targetTitles),
    skills: parseJsonArray(record.skills),
    stacks: parseJsonArray(record.stacks),
    industries: parseJsonArray(record.industries),
    contactRoleTargets: parseJsonArray(record.contactRoleTargets),
    educationEntries: parseJsonArray(record.educationEntries),
    companiesWorked: parseJsonArray(record.companiesWorked),
    schoolKeywords: parseJsonArray(record.schoolKeywords),
    connectionKeywords: parseJsonArray(record.connectionKeywords),
    links: parseLinks((record as any).links),
  });
}

export async function getActiveUserProfile() {
  return defaultUserProfile;
}

export async function getUserProfileByUserId(userId: string) {
  const record = await prisma.candidateProfile.findUnique({
    where: { userId },
  });

  return normalizeRecord(record);
}

// cache() deduplicates this within a single server render — multiple server
// components fetching the same user's profile only hit the DB once per request.
export const getProfileForUserOrDefault = cache(async function getProfileForUserOrDefault(
  userId?: string | null,
): Promise<UserProfile> {
  if (!userId) return defaultUserProfile;
  const profile = await getUserProfileByUserId(userId);
  return profile ?? defaultUserProfile;
});

export async function saveUserProfileForUser(userId: string, input: UserProfileInput) {
  const existing = await prisma.candidateProfile.findUnique({
    where: { userId },
  });

  const current = existing ? normalizeRecord(existing) : createDefaultProfileInputForUser();
  const merged = mergeProfile({ ...current, ...input });

  if (existing) {
    await prisma.candidateProfile.update({
      where: { id: existing.id },
      data: serializeProfile(merged, userId),
    });
  } else {
    await prisma.candidateProfile.create({
      data: serializeProfile(merged, userId),
    });
  }

  return merged;
}
