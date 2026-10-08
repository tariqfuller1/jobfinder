import { z } from "zod";

export type AtsKind = "greenhouse" | "lever" | "ashby";

export type AtsTarget = {
  ats: AtsKind;
  boardToken: string;
  postingId: string;
  /** The hosted application form the submit worker opens. */
  formUrl: string;
};

export type FieldType = "text" | "textarea" | "select" | "multiselect" | "checkbox" | "file" | "location";

export type FieldOption = { label: string; value: string; decline?: boolean };

/** Where a drafted answer came from — drives the review UI badges. */
export type AnswerSource = "profile" | "saved" | "rule" | "ai" | "user" | "missing" | "skipped";

export type AutoApplyField = {
  /** The ATS's own field name/path — the worker uses this to find the input. */
  key: string;
  label: string;
  description?: string;
  type: FieldType;
  required: boolean;
  options?: FieldOption[];
  section: "main" | "eeo";
  /** For select: the option value. For multiselect: values. For file: "resume" | "cover_letter" | "". */
  value: string | string[];
  source: AnswerSource;
  /** Legal / self-ID questions. Never answered by AI — only from saved answers or the user. */
  sensitive: boolean;
};

const yesNo = z.enum(["", "yes", "no"]).default("");

// Answers people otherwise type into every application. Profile data (name,
// email, phone, links, work history) is pulled from CandidateProfile instead.
export const savedAnswersSchema = z.object({
  phone: z.string().max(40).default(""),
  city: z.string().max(100).default(""),
  state: z.string().max(100).default(""),
  country: z.string().max(100).default("United States"),
  currentCompany: z.string().max(200).default(""),
  currentTitle: z.string().max(200).default(""),
  linkedinUrl: z.string().max(300).default(""),
  githubUrl: z.string().max(300).default(""),
  portfolioUrl: z.string().max(300).default(""),

  workAuthorizedUS: yesNo,
  requiresSponsorship: yesNo,
  over18: yesNo,
  willingToRelocate: yesNo,
  openToOnsite: yesNo,

  salaryExpectation: z.string().max(100).default(""),
  startDate: z.string().max(100).default(""),
  yearsExperience: z.string().max(20).default(""),
  howDidYouHear: z.string().max(200).default("Online job board"),
  pronouns: z.string().max(40).default(""),

  // EEO self-identification — "decline" picks the form's decline option.
  gender: z.enum(["decline", "male", "female", "nonbinary"]).default("decline"),
  hispanicLatino: z.enum(["decline", "yes", "no"]).default("decline"),
  race: z
    .enum([
      "decline",
      "american_indian",
      "asian",
      "black",
      "hispanic",
      "pacific_islander",
      "white",
      "two_or_more",
    ])
    .default("decline"),
  veteran: z.enum(["decline", "yes", "no"]).default("decline"),
  disability: z.enum(["decline", "yes", "no"]).default("decline"),
});

export type SavedAnswers = z.infer<typeof savedAnswersSchema>;

export function parseSavedAnswers(raw: string | null | undefined): SavedAnswers {
  try {
    const parsed = savedAnswersSchema.safeParse(JSON.parse(raw || "{}"));
    if (parsed.success) return parsed.data;
  } catch {
    // fall through to defaults
  }
  return savedAnswersSchema.parse({});
}

export function parseFields(raw: string | null | undefined): AutoApplyField[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? (parsed as AutoApplyField[]) : [];
  } catch {
    return [];
  }
}
