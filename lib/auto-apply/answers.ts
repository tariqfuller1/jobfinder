import type { UserProfile } from "@/lib/profile";
import type { AnswerSource, AutoApplyField, FieldOption, SavedAnswers } from "@/lib/auto-apply/types";

export type AnswerContext = {
  profile: UserProfile;
  saved: SavedAnswers;
  hasResume: boolean;
  jobCompany: string;
};

type Resolved = { value: string | string[]; source: AnswerSource };

// The question has a definite answer that only the user knows (salary, phone,
// work authorization, …) and none is saved. It must never be sent to AI.
const ASK = "ask" as const;

/** null means "no rule applies" — the question may go to the AI drafter. */
type Resolution = Resolved | typeof ASK | null;

const SKIP: Resolved = { value: "", source: "skipped" };

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function findLink(profile: UserProfile, pattern: RegExp) {
  return profile.links.find((l) => pattern.test(l.url) || pattern.test(l.label))?.url;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function select(field: AutoApplyField, option: FieldOption, source: AnswerSource): Resolved {
  return { value: field.type === "multiselect" ? [option.value] : option.value, source };
}

/** Puts a known text answer into the field — matching it to an option for choice fields. */
function answer(field: AutoApplyField, value: string | undefined | null, source: AnswerSource): Resolution {
  const text = value?.trim();
  if (!text) return ASK;
  if (!field.options?.length) return { value: text, source };
  const wanted = normalize(text);
  const option =
    field.options.find((o) => normalize(o.label) === wanted) ??
    field.options.find((o) => normalize(o.label).startsWith(wanted) || wanted.startsWith(normalize(o.label)));
  return option ? select(field, option, source) : ASK;
}

const COUNTRY_ALIASES = [
  ["united states", "united states of america", "usa", "u s a", "us", "u s"],
  ["united kingdom", "great britain", "uk", "england"],
];

/** Country dropdowns spell the same place many ways ("USA", "United States of America"). */
function countryAnswer(field: AutoApplyField, country: string): Resolution {
  const wanted = normalize(country);
  const names = COUNTRY_ALIASES.find((list) => list.includes(wanted)) ?? [wanted];
  for (const name of names) {
    const resolved = answer(field, name, "saved");
    if (resolved !== ASK) return resolved;
  }
  return ASK;
}

function yesNo(field: AutoApplyField, choice: "yes" | "no" | "" | boolean, source: AnswerSource): Resolution {
  if (choice === "") return ASK;
  const yes = choice === true || choice === "yes";
  if (!field.options?.length) return { value: yes ? "Yes" : "No", source };
  const option = field.options.find((o) => (yes ? /^\s*(yes|true)\b/i : /^\s*(no|false)\b/i).test(o.label));
  return option ? select(field, option, source) : ASK;
}

function decline(field: AutoApplyField): Resolution {
  const option = field.options?.find((o) => o.decline);
  return option ? select(field, option, "saved") : ASK;
}

function eeo(field: AutoApplyField, choice: string, patterns: Record<string, RegExp>): Resolution {
  const pattern = patterns[choice];
  const option = pattern && field.options?.find((o) => pattern.test(o.label));
  return option ? select(field, option, "saved") : decline(field);
}

const RACE: Record<string, RegExp> = {
  american_indian: /american indian|alaska/i,
  asian: /^\s*asian/i,
  black: /black|african/i,
  hispanic: /hispanic|latin/i,
  pacific_islander: /hawaiian|pacific/i,
  white: /^\s*white/i,
  two_or_more: /two or more/i,
};

const NON_US_COUNTRY =
  /canada|united kingdom|\buk\b|europe|\beu\b|germany|france|ireland|india|australia|netherlands|spain|sweden|poland|brazil|mexico|singapore|japan|israel/i;

function yearsRange(field: AutoApplyField, years: string): Resolution {
  const n = Number.parseFloat(years);
  if (!Number.isFinite(n)) return ASK;
  if (!field.options?.length) return { value: years, source: "saved" };
  const option = field.options.find((o) => {
    const nums = o.label.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    if (nums.length >= 2) return n >= nums[0] && n <= nums[1];
    if (nums.length === 1 && /\+|more|over|above/i.test(o.label)) return n >= nums[0];
    if (nums.length === 1 && /less|under|below|fewer/i.test(o.label)) return n < nums[0];
    return nums.length === 1 && n === nums[0];
  });
  return option ? select(field, option, "saved") : ASK;
}

/** Answers everything that has a definite answer from the profile or saved answers. */
function resolveKnown(field: AutoApplyField, ctx: AnswerContext): Resolution {
  const { profile, saved } = ctx;
  const key = field.key.toLowerCase();
  const label = field.label.toLowerCase();
  const { first, last } = splitName(profile.name);
  const latestJob = profile.workExperience[0];

  if (field.type === "file") {
    if (/resume|cv\b/.test(`${key} ${label}`)) return ctx.hasResume ? { value: "resume", source: "saved" } : ASK;
    return field.required ? ASK : SKIP;
  }

  // Screening puzzles ("decode this base64 and submit the secret") are meant for the candidate.
  if (/[A-Za-z0-9+/]{120,}={0,2}/.test(field.label)) return ASK;

  // Required privacy-policy / data-processing acknowledgements with a single checkbox.
  if (
    field.required &&
    field.options?.length === 1 &&
    /consent|acknowledg|privacy|agree/.test(`${key} ${label} ${field.options[0].label.toLowerCase()}`)
  ) {
    return select(field, field.options[0], "rule");
  }

  // ── Identity & contact ──
  if (key === "first_name" || /^(legal )?first name/.test(label)) return answer(field, first, "profile");
  if (key === "last_name" || /^(legal )?(last name|surname|family name)/.test(label)) return answer(field, last, "profile");
  if (key === "preferred_name" || /preferred (first )?name/.test(label)) return field.required ? answer(field, first, "profile") : SKIP;
  if (key === "name" || key === "_systemfield_name" || /^(full )?(legal )?name$/.test(label)) return answer(field, profile.name, "profile");
  if (key === "email" || key === "_systemfield_email" || /^e-?mail/.test(label)) return answer(field, profile.email, "profile");
  if (/phone|mobile number/.test(label)) return answer(field, saved.phone || profile.phone, "saved");
  if (field.type === "location" || /^(current )?location$|where are you (currently )?(located|based)|^city\b/.test(label)) {
    const location = [saved.city, saved.state].filter(Boolean).join(", ") || profile.location;
    return answer(field, location, "saved");
  }
  if (/what country|which country|country (of residence|are you|do you)/.test(label)) return countryAnswer(field, saved.country);

  // ── Links ──
  if (/linkedin/.test(`${key} ${label}`)) return answer(field, saved.linkedinUrl || findLink(profile, /linkedin/i), "saved");
  if (/github/.test(`${key} ${label}`)) return answer(field, saved.githubUrl || findLink(profile, /github/i), "saved");
  if (/portfolio|personal (web)?site|^website/.test(`${key} ${label}`)) {
    const other = profile.links.find((l) => !/linkedin|github/i.test(l.url))?.url;
    return answer(field, saved.portfolioUrl || other, "saved");
  }
  if (key === "urls[other]" || key === "comments" || /^additional information/.test(label)) return field.required ? null : SKIP;

  // ── Current role ──
  if (key === "org" || /current (company|employer)|most recent (company|employer)|^company( name)?$/.test(label)) {
    return answer(field, saved.currentCompany || latestJob?.company, "saved");
  }
  if (/current (job )?title|current (role|position)|most recent (job )?title/.test(label)) {
    return answer(field, saved.currentTitle || latestJob?.title, "saved");
  }

  // ── Logistics ──
  if (/hear about|how did you (find|learn)|where did you (find|see|hear)/.test(label)) {
    if (!field.options?.length) return answer(field, saved.howDidYouHear, "saved");
    const option =
      field.options.find((o) => normalize(o.label) === normalize(saved.howDidYouHear)) ??
      [/job board/i, /online|internet|website/i, /other/i]
        .map((p) => field.options!.find((o) => p.test(o.label)))
        .find(Boolean);
    return option ? select(field, option, "rule") : null;
  }
  if (/were you referred|referred by|referral/.test(label)) {
    return field.options?.length ? yesNo(field, "no", "rule") : SKIP;
  }
  if (/salary|compensation|pay expectation|desired pay/.test(label)) return answer(field, saved.salaryExpectation, "saved");
  if (/start date|when (can|could) you start|notice period|available to start|earliest (date|start)/.test(label)) {
    return answer(field, saved.startDate, "saved");
  }
  if (/^(how many )?years of (professional |relevant |work |industry )?experience|how many years of (professional|relevant|work|industry) experience/.test(label)) {
    return yearsRange(field, saved.yearsExperience);
  }
  if (/pronoun/.test(label)) return answer(field, saved.pronouns, "saved");
  if (/cover letter/.test(label) && !field.required) return SKIP;

  // ── Legal ──
  if (/authori[sz]ed to work|legally (eligible|authori[sz]ed|able)|eligible to work|right to work|work authori[sz]ation/.test(label)) {
    if (NON_US_COUNTRY.test(label)) return ASK;
    return yesNo(field, saved.workAuthorizedUS, "saved");
  }
  if (/sponsor/.test(label)) {
    const choice = saved.requiresSponsorship;
    if (choice === "") return ASK;
    // "Can you work without sponsorship?" flips the meaning of yes.
    const inverted = /without (requiring |needing |the need for |any )?(visa |employment |work )?sponsor/.test(label);
    return yesNo(field, inverted ? choice === "no" : choice === "yes", "saved");
  }
  if (/18 years|at least 18|over 18|over the age of 18/.test(label)) return yesNo(field, saved.over18, "saved");
  if (/(currently )?(located|based|reside|living|live) in the (united states|u\.s\.|us\b|usa)/.test(label)) {
    return yesNo(field, normalize(saved.country) === "united states" ? "yes" : "no", "saved");
  }
  const company = normalize(ctx.jobCompany);
  const aboutThisCompany =
    (company && normalize(label).includes(company)) || /\b(us|here|our company|this company)\b/.test(label);
  if (aboutThisCompany && /(previously|ever|formerly|in the past).{0,30}(employed|worked)|former employee/.test(label)) {
    const worked = [...profile.companiesWorked, ...profile.workExperience.map((w) => w.company)]
      .some((c) => normalize(c) === company);
    return yesNo(field, worked, "rule");
  }
  // Only a saved "yes" is definitive — a "no" may still be "yes, I'm already based there".
  if (/relocat/.test(label) && saved.willingToRelocate === "yes") return yesNo(field, "yes", "saved");
  if (
    saved.openToOnsite &&
    /(able|willing|open|comfortable).{0,40}(in.?office|on.?site|onsite|hybrid|commut|days (a|per) week)/.test(label)
  ) {
    return yesNo(field, saved.openToOnsite, "saved");
  }

  // ── EEO self-identification ──
  if (/transgender|sexual orientation|lgbt/.test(label)) return decline(field);
  if (/gender/.test(label)) {
    return eeo(field, saved.gender, {
      male: /^\s*(male|man)\b/i,
      female: /^\s*(female|woman)\b/i,
      nonbinary: /non.?binary|gender.?(queer|fluid)/i,
    });
  }
  if (/hispanic|latin[oax]/.test(label) && field.options?.some((o) => /^\s*(yes|no)\b/i.test(o.label))) {
    if (saved.hispanicLatino === "decline") return decline(field);
    const resolved = yesNo(field, saved.hispanicLatino, "saved");
    return resolved === ASK ? decline(field) : resolved;
  }
  if (/\brace\b|ethnic/.test(label)) return eeo(field, saved.race, RACE);
  if (/veteran/.test(label)) {
    return eeo(field, saved.veteran, {
      yes: /identify as (one or more|a protected)|i am a (protected )?veteran|^\s*yes/i,
      no: /not a (protected )?veteran|^\s*no\b/i,
    });
  }
  if (/disab/.test(label)) return eeo(field, saved.disability, { yes: /^\s*yes/i, no: /^\s*no\b/i });
  if (field.section === "eeo" || field.sensitive) return decline(field);

  return null;
}

/**
 * Fills every field it can without AI. Required fields left "missing" either
 * go to the AI drafter (when not sensitive) or wait for the user.
 */
export function applyKnownAnswers(fields: AutoApplyField[], ctx: AnswerContext): AutoApplyField[] {
  return fields.map((field) => {
    const resolved = resolveKnown(field, ctx);
    // Optional questions nobody can answer definitively are left blank.
    if (!field.required && (resolved === ASK || resolved === null)) return { ...field, source: "skipped" };
    if (resolved === ASK) return { ...field, sensitive: true };
    if (resolved) return { ...field, value: resolved.value, source: resolved.source };
    return field;
  });
}

export function needsAi(field: AutoApplyField) {
  return field.source === "missing" && field.required && !field.sensitive && field.type !== "file";
}

export function isAnswered(field: AutoApplyField) {
  return Array.isArray(field.value) ? field.value.length > 0 : field.value.trim().length > 0;
}

/** Required fields still blank — the review page blocks approval until these are filled. */
export function missingRequired(fields: AutoApplyField[]) {
  return fields.filter((f) => f.required && !isAnswered(f));
}
