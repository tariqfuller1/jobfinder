import { type NormalizedEmploymentType, type NormalizedExperienceLevel, type NormalizedWorkplaceType } from "@/types/jobs";

export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

export function inferWorkplaceType(input: string | null | undefined): NormalizedWorkplaceType {
  const value = `${input ?? ""}`.toLowerCase();
  if (value.includes("remote")) return "REMOTE";
  if (value.includes("hybrid")) return "HYBRID";
  if (value.includes("on-site") || value.includes("onsite") || value.includes("on site") || value.includes("in office")) return "ONSITE";
  return "UNKNOWN";
}

export function inferEmploymentType(input: string | null | undefined): NormalizedEmploymentType {
  const value = `${input ?? ""}`.toLowerCase();
  if (value.includes("intern")) return "INTERNSHIP";
  if (value.includes("contract") || value.includes("freelance")) return "CONTRACT";
  if (value.includes("part-time") || value.includes("part time")) return "PART_TIME";
  if (value.includes("temporary") || value.includes("temp")) return "TEMPORARY";
  if (value.includes("full-time") || value.includes("full time")) return "FULL_TIME";
  return "UNKNOWN";
}

export function inferExperienceLevel(input: string | null | undefined): NormalizedExperienceLevel {
  const value = `${input ?? ""}`.toLowerCase();
  if (value.includes("intern")) return "INTERN";
  if (value.includes("junior") || value.includes("entry") || value.includes("new grad")) return "ENTRY";
  if (value.includes("senior") || value.includes("principal")) return "SENIOR";
  if (value.includes("staff") || value.includes("lead") || value.includes("manager")) return "LEAD";
  if (value.includes("mid")) return "MID";
  return "UNKNOWN";
}

export function parseTags(...values: Array<string | null | undefined>): string[] {
  return values
    .flatMap((value) => `${value ?? ""}`.split(/[,|/]/g))
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 12);
}
