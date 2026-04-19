import type { UserProfileInput } from "@/lib/profile";

const SKILL_CATALOG = [
  "Unity",
  "Unreal",
  "C#",
  "C++",
  "C",
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "HTML",
  "CSS",
  "SQL",
  "Git",
  "Figma",
  "Aseprite",
  "Maya",
  "Photoshop",
  "Axios",
  "Prisma",
  "Gameplay",
  "Game development",
  "UI/UX",
  "HCI",
  "REST",
  "Full stack",
  "Frontend",
  "Backend",
  "Unity Engine",
  "Godot",
  "Swift",
];

const TITLE_KEYWORDS = [
  "software engineer",
  "software developer",
  "frontend engineer",
  "full stack engineer",
  "gameplay programmer",
  "game programmer",
  "tools engineer",
  "unity developer",
  "engine programmer",
  "junior programmer",
  "associate engineer",
  "new grad",
  "intern",
];

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

function splitLines(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function extractName(lines: string[]) {
  const candidate = lines.find((line) => line.length >= 5 && line.length <= 60 && !/@|http|www\./i.test(line));
  return candidate?.replace(/\s*resume$/i, "").trim();
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractPhone(text: string) {
  return text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0];
}

function extractLocation(lines: string[]) {
  return lines.find((line) => /remote|,[ ]?[A-Z]{2}\b|north carolina|raleigh|durham|cary|charlotte|united states/i.test(line));
}

function extractEducation(lines: string[]) {
  return unique(
    lines.filter((line) =>
      /university|college|institute|school|community college|bachelor|master|bs |b\.s\.|bachelor of science/i.test(line),
    ),
  ).slice(0, 8);
}

function extractSchoolKeywords(educationEntries: string[]) {
  const keywords: string[] = [];
  for (const entry of educationEntries) {
    keywords.push(entry);
    const short = entry
      .replace(/bachelor.*$/i, "")
      .replace(/master.*$/i, "")
      .replace(/class of.*$/i, "")
      .replace(/,.*$/i, "")
      .trim();
    if (short) keywords.push(short);
    const acronym = short
      .split(/\s+/)
      .filter((word) => /^[A-Z]/.test(word))
      .map((word) => word[0])
      .join("");
    if (acronym.length >= 2) keywords.push(acronym);
  }
  return unique(keywords);
}

function extractSkills(text: string) {
  const lower = text.toLowerCase();
  return SKILL_CATALOG.filter((skill) => lower.includes(skill.toLowerCase()));
}

function extractTargetTitles(text: string) {
  const lower = text.toLowerCase();
  return TITLE_KEYWORDS.filter((title) => lower.includes(title));
}

function extractCompaniesWorked(lines: string[]) {
  const experienceSection = lines.filter((line) =>
    /engineer|developer|instructor|assistant|intern|lab|school|studio|company|inc\.?|llc|corp\.?/i.test(line),
  );

  return unique(
    experienceSection
      .map((line) => {
        const cleaned = line
          .replace(/^(experience|work experience|professional experience)[:\-]?/i, "")
          .replace(/\b(software engineer|software developer|developer|engineer|instructor|assistant|intern)\b.*$/i, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        return cleaned.length >= 3 && cleaned.length <= 80 ? cleaned : null;
      })
      .filter(Boolean),
  ).slice(0, 8);
}

function summarize(lines: string[]) {
  const summaryLine = lines.find((line) => line.length > 70 && !/@|http|www\./i.test(line));
  return summaryLine?.slice(0, 280);
}

function detectPreferredLocations(location?: string, educationEntries: string[] = []) {
  const candidates = [location ?? "", ...educationEntries].join(" | ");
  const picks: string[] = [];
  if (/remote/i.test(candidates)) picks.push("Remote US");
  if (/north carolina|\bNC\b/i.test(candidates)) picks.push("North Carolina", "NC");
  if (/raleigh/i.test(candidates)) picks.push("Raleigh");
  if (/durham/i.test(candidates)) picks.push("Durham");
  if (/cary/i.test(candidates)) picks.push("Cary");
  if (/charlotte/i.test(candidates)) picks.push("Charlotte");
  if (/washington/i.test(candidates)) picks.push("Washington");
  return unique(picks);
}

export function parseResumeText(text: string, fileName?: string): UserProfileInput {
  const cleanedText = text.replace(/\r/g, "").trim();
  const lines = splitLines(cleanedText);
  const educationEntries = extractEducation(lines);
  const schoolKeywords = extractSchoolKeywords(educationEntries);
  const skills = extractSkills(cleanedText);
  const companiesWorked = extractCompaniesWorked(lines);
  const targetTitles = extractTargetTitles(cleanedText);
  const location = extractLocation(lines);
  const preferredLocations = detectPreferredLocations(location, educationEntries);
  const preferredStates = preferredLocations.filter((value) => /NC|North Carolina/i.test(value));
  const stacks = skills.filter((skill) => /Unity|Unreal|React|Next\.js|Node\.js|TypeScript|JavaScript|C#|C\+\+|Python|Prisma/i.test(skill));
  const industries = unique([
    /game/i.test(cleanedText) ? "Game development" : undefined,
    /software/i.test(cleanedText) ? "Product software" : undefined,
    /frontend|react|ui|ux/i.test(cleanedText) ? "Frontend / UX" : undefined,
  ]);

  const connectionKeywords = unique([
    ...schoolKeywords.map((keyword) => `${keyword} alumni`),
    ...companiesWorked,
    ...skills.slice(0, 6),
  ]);

  const summary = summarize(lines);
  const headline = lines.find((line) => line !== extractName(lines) && line.length <= 120 && !/@|http|www\./i.test(line));

  return {
    name: extractName(lines),
    email: extractEmail(cleanedText),
    phone: extractPhone(cleanedText),
    location,
    headline,
    summary,
    preferredLocations,
    preferredStates,
    remotePreference: /remote/i.test(cleanedText) ? ["REMOTE", "HYBRID", "ONSITE"] : ["HYBRID", "ONSITE", "REMOTE"],
    targetCategories: /game|unity|unreal|gameplay/i.test(cleanedText) ? ["BOTH", "GAMING", "SOFTWARE"] : ["SOFTWARE", "BOTH"],
    targetTitles,
    skills,
    stacks,
    industries,
    contactRoleTargets: ["Recruiter", "Hiring Manager", "Engineering Manager", "University Recruiter"],
    educationEntries,
    companiesWorked,
    schoolKeywords,
    connectionKeywords,
    resumeText: cleanedText,
    rawUploadName: fileName,
  };
}
