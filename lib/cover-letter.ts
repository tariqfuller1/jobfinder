import type { UserProfile } from "@/lib/profile";

function sentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeBlob(parts: Array<string | null | undefined | string[]>) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string => Boolean(part))
    .join(" | ")
    .toLowerCase();
}

function includesAny(text: string, values: string[]) {
  const lower = text.toLowerCase();
  return values.filter((value) => lower.includes(value.toLowerCase()));
}

function unique(values: string[]) {
  return Array.from(new Map(values.map((value) => [value.toLowerCase(), value])).values());
}

function firstParagraph(summary?: string | null) {
  if (!summary) return "";
  return summary
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean) ?? summary.trim();
}

function pickRoleHighlights(job: {
  title: string;
  company: string;
  location?: string | null;
  tags?: string[];
  descriptionText?: string | null;
}) {
  const text = normalizeBlob([job.title, job.company, job.location, job.tags ?? [], job.descriptionText]);
  const roleKeywords = [
    "frontend",
    "full stack",
    "backend",
    "product",
    "platform",
    "gameplay",
    "engine",
    "tools",
    "ui",
    "ux",
    "react",
    "typescript",
    "javascript",
    "node",
    "unity",
    "c#",
    "c++",
    "python",
    "graphics",
    "mobile",
    "web",
    "api",
    "cloud",
  ];

  return unique(includesAny(text, roleKeywords)).slice(0, 4);
}

function buildSkillParagraph(job: {
  title: string;
  company: string;
  location?: string | null;
  tags?: string[];
  descriptionText?: string | null;
}, profile: UserProfile) {
  const text = normalizeBlob([job.title, job.company, job.location, job.tags ?? [], job.descriptionText]);
  const skillHits = unique(includesAny(text, [...profile.skills, ...profile.stacks]));
  const roleHighlights = pickRoleHighlights(job);

  if (skillHits.length >= 3) {
    return `My background lines up especially well with the technical needs of this role through ${skillHits.slice(0, 3).join(", ")}, and I would be excited to bring that foundation to ${job.company}.`;
  }

  if (skillHits.length > 0 && roleHighlights.length > 0) {
    return `I already have hands-on experience with ${skillHits.slice(0, 2).join(" and ")}, and I am especially excited by the way this position touches ${roleHighlights.join(", ")}.`;
  }

  if (roleHighlights.length > 0) {
    return `What stands out to me most about this role is the opportunity to contribute to ${roleHighlights.join(", ")}, which matches the kind of work I want to keep building.`;
  }

  return `I am especially drawn to this opportunity because it sits at the intersection of practical engineering, strong user experience, and the kind of product-focused problem solving I enjoy most.`;
}

function buildExperienceParagraph(job: { company: string }, profile: UserProfile) {
  const summary = firstParagraph(profile.summary);
  const school = profile.educationEntries[0] || profile.schoolKeywords[0];
  const companyWorked = profile.companiesWorked[0];

  const parts = [
    summary,
    school ? `My background also includes ${school}.` : "",
    companyWorked ? `I have also applied that experience in roles such as ${companyWorked}.` : "",
  ].filter(Boolean);

  const combined = parts.join(" ");
  if (combined) {
    return `${combined} I believe that mix would let me contribute quickly while continuing to grow with ${job.company}.`;
  }

  return `Across my projects and experience, I have focused on building thoughtful software, learning quickly, and turning ideas into polished experiences that people can actually use.`;
}

function buildClosingParagraph(job: { company: string; title: string }, profile: UserProfile) {
  const preferredLocation = profile.preferredLocations[0];
  const remotePreference = profile.remotePreference[0];
  const locationLine = preferredLocation
    ? `I am actively targeting opportunities in ${preferredLocation}${remotePreference ? ` and am open to ${sentenceCase(remotePreference.toLowerCase())} work as well` : ""}.`
    : "I am excited about opportunities where I can contribute, learn quickly, and keep growing as an engineer.";

  return `${locationLine} Thank you for taking the time to review my application for the ${job.title} role at ${job.company}. I would welcome the chance to speak more about how I could contribute to your team.`;
}

export function buildCoverLetter(
  job: {
    title: string;
    company: string;
    location?: string | null;
    tags?: string[];
    descriptionText?: string | null;
  },
  profile: UserProfile,
) {
  const greeting = `Dear Hiring Team at ${job.company},`;
  const intro = `I am excited to apply for the ${job.title} position at ${job.company}. With a background centered on building polished software and interactive experiences, I was immediately interested in this opportunity because it feels closely aligned with the kind of work I want to keep doing.`;
  const skillParagraph = buildSkillParagraph(job, profile);
  const experienceParagraph = buildExperienceParagraph(job, profile);
  const closingParagraph = buildClosingParagraph(job, profile);

  return [
    greeting,
    "",
    intro,
    "",
    skillParagraph,
    "",
    experienceParagraph,
    "",
    closingParagraph,
    "",
    "Sincerely,",
    profile.name,
    ...(profile.email ? [profile.email] : []),
    ...(profile.phone ? [profile.phone] : []),
  ].join("\n");
}

export function buildCoverLetterTalkingPoints(
  job: {
    title: string;
    company: string;
    location?: string | null;
    tags?: string[];
    descriptionText?: string | null;
  },
  profile: UserProfile,
) {
  const text = normalizeBlob([job.title, job.company, job.location, job.tags ?? [], job.descriptionText]);
  const skills = unique(includesAny(text, [...profile.skills, ...profile.stacks])).slice(0, 5);
  const titles = unique(includesAny(text, profile.targetTitles)).slice(0, 3);
  const schools = profile.educationEntries.slice(0, 2);
  const roleHighlights = pickRoleHighlights(job);

  return {
    matchedSkills: skills,
    matchedTitles: titles,
    schoolMentions: schools,
    roleHighlights,
  };
}
