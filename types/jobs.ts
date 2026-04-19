export type NormalizedWorkplaceType = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
export type NormalizedEmploymentType =
  | "FULL_TIME"
  | "INTERNSHIP"
  | "CONTRACT"
  | "PART_TIME"
  | "TEMPORARY"
  | "UNKNOWN";
export type NormalizedExperienceLevel =
  | "INTERN"
  | "ENTRY"
  | "MID"
  | "SENIOR"
  | "LEAD"
  | "UNKNOWN";

export type NormalizedJob = {
  externalId: string;
  source: string;
  sourceUrl: string;
  applyUrl: string;
  title: string;
  company: string;
  location: string | null;
  workplaceType: NormalizedWorkplaceType;
  employmentType: NormalizedEmploymentType;
  experienceLevel: NormalizedExperienceLevel;
  descriptionHtml: string | null;
  descriptionText: string | null;
  postedAt: Date | null;
  tags: string[];
};
