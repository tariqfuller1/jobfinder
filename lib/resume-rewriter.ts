import type { UserProfile } from "@/lib/profile";
import type { ResumeFeedback } from "@/lib/resume-feedback";
import { buildResumeFeedback } from "@/lib/resume-feedback";

function unique(values: string[]) {
  return Array.from(new Map(values.map((value) => [value.toLowerCase(), value])).values());
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
}

function buildSkillSection(profile: UserProfile, feedback: ResumeFeedback) {
  return unique([...feedback.keywordsToMirror, ...profile.skills, ...profile.stacks]).slice(0, 14);
}

function buildExperienceSection(profile: UserProfile, jobTitle: string, feedback: ResumeFeedback) {
  const orgs = profile.companiesWorked.length ? profile.companiesWorked : ["Recent project or experience"];

  return orgs.slice(0, 3).map((org, index) => ({
    heading: org,
    bullets: [
      index === 0
        ? `Tailor this section toward ${jobTitle} by leading with the most relevant work you owned and the result it produced.`
        : `Show the part of your work at ${org} that best supports this ${jobTitle} application.` ,
      feedback.bulletPrompts[index] || `Name the tools you used, what you built, and what changed because of your work.`,
      feedback.proofPrompts[index] || `Add a measurable outcome so the bullet reads like evidence instead of a task list.`,
    ],
  }));
}

export function buildResumeRewrite(
  job: {
    title: string;
    company: string;
    location?: string | null;
    descriptionText?: string | null;
    tags?: string[];
    workplaceType?: string;
    experienceLevel?: string;
  },
  profile: UserProfile,
) {
  const feedback = buildResumeFeedback({
    ...job,
    workplaceType: job.workplaceType ?? "UNKNOWN",
    experienceLevel: job.experienceLevel ?? "UNKNOWN",
  }, profile);
  const skills = buildSkillSection(profile, feedback);
  const experience = buildExperienceSection(profile, job.title, feedback);
  const education = profile.educationEntries.length ? profile.educationEntries : ["Add your degree, school, graduation month/year, and standout coursework."];
  const contactLine = [profile.location, profile.email, profile.phone].filter(Boolean).join(" | ");

  const header = [
    profile.name,
    contactLine,
    feedback.headlineSuggestion,
  ].filter(Boolean).join("\n");

  const summary = [
    feedback.summarySuggestion,
    `Target role: ${job.title} at ${job.company}.`,
    profile.preferredLocations.length ? `Preferred locations: ${profile.preferredLocations.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const experienceText = experience
    .map((entry) => [entry.heading, ...entry.bullets.map((bullet) => `• ${bullet}`)].join("\n"))
    .join("\n\n");

  const projectsText = [
    "PROJECTS OR SELECTED WORK",
    ...feedback.bulletPrompts.map((prompt) => `• ${prompt}`),
  ].join("\n");

  const tailoringChecklist = [
    ...feedback.improvementSteps,
    ...feedback.cautions.map((item) => `Avoid: ${item}`),
  ]
    .map((item) => `• ${item}`)
    .join("\n");

  return {
    feedback,
    draft: [
      header,
      "",
      "PROFESSIONAL SUMMARY",
      summary,
      "",
      "CORE SKILLS",
      skills.join(" • "),
      "",
      "SELECTED EXPERIENCE",
      experienceText,
      "",
      projectsText,
      "",
      "EDUCATION",
      education.map((entry) => `• ${entry}`).join("\n"),
      "",
      "ROLE TAILORING NOTES",
      tailoringChecklist,
      "",
      "ORIGINAL RESUME CONTEXT",
      profile.resumeText?.trim() ? profile.resumeText.trim().slice(0, 2500) : "No resume text has been uploaded yet. Import your resume on the profile page so this rewrite can mirror your real experience more closely.",
    ].join("\n"),
    title: `${titleCase(job.title)} Resume Rewrite`,
    highlights: unique([...feedback.matchStrengths, ...feedback.keywordsToMirror]).slice(0, 10),
  };
}
