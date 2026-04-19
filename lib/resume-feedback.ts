import type { ExperienceLevel, WorkplaceType } from "@prisma/client";
import type { UserProfile } from "@/lib/profile";

function normalizeBlob(parts: Array<string | null | undefined | string[]>) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string => Boolean(part))
    .join(" | ")
    .toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Map(values.map((value) => [value.toLowerCase(), value])).values());
}

function includesAny(text: string, values: string[]) {
  const lower = text.toLowerCase();
  return values.filter((value) => lower.includes(value.toLowerCase()));
}

const KEYWORD_CATALOG = [
  "unity",
  "unreal",
  "c#",
  "c++",
  "typescript",
  "javascript",
  "react",
  "next.js",
  "node",
  "node.js",
  "python",
  "sql",
  "api",
  "aws",
  "cloud",
  "frontend",
  "backend",
  "full stack",
  "ui",
  "ux",
  "gameplay",
  "engine",
  "tools",
  "graphics",
  "animation",
  "mobile",
  "web",
  "testing",
  "automation",
  "debugging",
  "performance",
  "optimization",
  "collaboration",
  "product",
  "platform",
  "systems",
];

function detectRoleFamily(text: string) {
  if (/gameplay|unity|unreal|engine|graphics|player/.test(text)) return "gameplay" as const;
  if (/frontend|react|ui\b|ux\b|web/.test(text)) return "frontend" as const;
  if (/backend|api|cloud|platform|node|sql/.test(text)) return "backend" as const;
  if (/full stack/.test(text)) return "fullstack" as const;
  if (/tools|pipeline|internal/.test(text)) return "tools" as const;
  return "general" as const;
}

function pickRoleHighlights(text: string) {
  const roleKeywords = [
    "frontend",
    "backend",
    "full stack",
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
    "platform",
    "performance",
  ];

  return unique(includesAny(text, roleKeywords)).slice(0, 6);
}

function sentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type ResumeFeedback = {
  headlineSuggestion: string;
  summarySuggestion: string;
  matchStrengths: string[];
  keywordsToMirror: string[];
  missingKeywords: string[];
  sectionsToStrengthen: string[];
  improvementSteps: string[];
  bulletPrompts: string[];
  proofPrompts: string[];
  cautions: string[];
};

export function buildResumeFeedback(
  job: {
    title: string;
    company: string;
    location?: string | null;
    workplaceType: WorkplaceType | string;
    experienceLevel: ExperienceLevel | string;
    tags?: string[];
    descriptionText?: string | null;
  },
  profile: UserProfile,
): ResumeFeedback {
  const text = normalizeBlob([job.title, job.company, job.location, job.tags ?? [], job.descriptionText]);
  const roleFamily = detectRoleFamily(text);
  const roleHighlights = pickRoleHighlights(text);
  const profileKeywords = unique([
    ...profile.skills,
    ...profile.stacks,
    ...profile.targetTitles,
    ...profile.industries,
    ...profile.connectionKeywords,
  ]);

  const matchedSkills = unique(includesAny(text, [...profile.skills, ...profile.stacks])).slice(0, 6);
  const matchedTitles = unique(includesAny(text, profile.targetTitles)).slice(0, 3);
  const matchedStrengths = unique([...matchedTitles, ...matchedSkills]).slice(0, 8);

  const jobKeywords = unique(includesAny(text, KEYWORD_CATALOG));
  const missingKeywords = jobKeywords
    .filter((keyword) => !profileKeywords.some((value) => value.toLowerCase() === keyword.toLowerCase()))
    .slice(0, 6);

  const keywordsToMirror = unique([...matchedSkills, ...roleHighlights, ...missingKeywords]).slice(0, 8);

  const sectionsToStrengthen = unique([
    "Summary",
    matchedSkills.length ? "Skills" : "Projects",
    missingKeywords.length ? "Projects" : "Experience",
    job.experienceLevel === "ENTRY" || job.experienceLevel === "INTERN" ? "Education" : "Experience",
  ]);

  const matchLine = matchedStrengths.length
    ? `Lean hardest on ${matchedStrengths.slice(0, 3).join(", ")} because those already line up with the role.`
    : `Use your strongest technical work to create a clearer bridge into this role.`;

  const keywordLine = missingKeywords.length
    ? `If you genuinely have exposure to ${missingKeywords.slice(0, 3).join(", ")}, say it clearly in your summary, skills section, or project bullets.`
    : `The role language already overlaps with your background, so focus more on proof and ordering than on adding new keywords.`;

  const locationLine = job.location
    ? `Keep the target location visible near the top if this role is tied to ${job.location}.`
    : `Keep your location and remote flexibility easy to find near the top of the page.`;

  const improvementSteps = [
    `Rewrite the top summary so it sounds tailored to a ${job.title} role instead of a generic application.`,
    matchLine,
    keywordLine,
    `Move the single best matching project or experience bullet higher so it appears in the first half of the resume.`,
    `Add measurable outcomes wherever possible, such as performance gains, user impact, shipped features, or scope owned.`,
    locationLine,
  ];

  const summaryLead = matchedStrengths.length
    ? `Early-career ${matchedTitles[0] ?? "engineer"} with hands-on experience in ${matchedStrengths.slice(0, 3).join(", ")}`
    : `Early-career engineer with hands-on experience building polished software and interactive systems`;

  const summaryTailByFamily: Record<string, string> = {
    gameplay: `through projects focused on responsive gameplay, technical problem solving, and end-to-end implementation.`,
    frontend: `through projects focused on responsive interfaces, user experience, and shipping polished features.`,
    backend: `through projects focused on systems thinking, APIs, data flow, and reliable implementation.`,
    fullstack: `through projects that connect frontend user experience with backend logic and data.`,
    tools: `through projects focused on developer workflows, systems support, and practical tooling.`,
    general: `through projects focused on practical engineering, clear user value, and fast learning.`,
  };

  const summarySuggestion = `${summaryLead} ${summaryTailByFamily[roleFamily]} Seeking to contribute to ${job.company} as a ${job.title}.`;

  const headlineCore = matchedTitles[0]
    ? sentenceCase(matchedTitles[0])
    : sentenceCase(job.title.toLowerCase());
  const headlineSkillTail = matchedSkills.length
    ? ` | ${matchedSkills.slice(0, 3).join(" • ")}`
    : roleHighlights.length
      ? ` | ${roleHighlights.slice(0, 3).join(" • ")}`
      : "";
  const headlineSuggestion = `${headlineCore}${headlineSkillTail}`;

  const bulletPrompts = [
    roleFamily === "gameplay"
      ? `Add a project bullet that shows gameplay systems you implemented, how they worked, and what made the experience feel polished.`
      : roleFamily === "frontend"
        ? `Add a bullet that shows a UI or web feature you built, the technologies used, and what improved for the user.`
        : roleFamily === "backend"
          ? `Add a bullet that shows a system, API, or data feature you built, how it worked, and why it was reliable or scalable.`
          : roleFamily === "tools"
            ? `Add a bullet showing any internal tool, workflow improvement, or technical support system you built and who it helped.`
            : `Add a bullet showing the software project most similar to this role and what you personally owned.`,
    matchedSkills.length
      ? `Write one bullet that explicitly names ${matchedSkills.slice(0, 2).join(" and ")} so the recruiter sees the overlap quickly.`
      : `Write one bullet that connects your strongest technical project directly to the core work in this role.`,
    missingKeywords.length
      ? `If it is truthful, add a bullet or skills line that naturally mentions ${missingKeywords.slice(0, 2).join(" and ")}.`
      : `Use stronger action/result language so the role fit is obvious without changing your underlying experience.`,
  ];

  const proofPrompts = [
    `What did you build that best matches ${job.title}, and what part did you personally own?`,
    `What tools, languages, or systems from this job did you already use in projects, coursework, internships, or teaching?`,
    `What result can you quantify: speed, polish, engagement, bug reduction, usability, scope, or shipped functionality?`,
  ];

  const cautions = [
    `Do not add keywords you cannot defend in an interview.`,
    `Avoid keeping the summary too broad when the job itself is specific.`,
    `Replace generic phrases like “worked on” with what you built, how you built it, and what changed because of it.`,
  ];

  return {
    headlineSuggestion,
    summarySuggestion,
    matchStrengths: matchedStrengths,
    keywordsToMirror,
    missingKeywords,
    sectionsToStrengthen,
    improvementSteps,
    bulletPrompts,
    proofPrompts,
    cautions,
  };
}
