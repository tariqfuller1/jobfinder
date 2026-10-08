import * as cheerio from "cheerio";
import type { AtsTarget, AutoApplyField, FieldOption, FieldType } from "@/lib/auto-apply/types";

/**
 * Reads an application form's questions without a browser:
 *   Greenhouse — public job board API (?questions=true)
 *   Lever      — server-rendered apply page (questions embedded as JSON templates)
 *   Ashby      — the public GraphQL endpoint the hosted form itself uses
 * Every field comes back unanswered (value "", source "missing").
 */
export async function fetchApplicationForm(target: AtsTarget): Promise<AutoApplyField[]> {
  switch (target.ats) {
    case "greenhouse":
      return fetchGreenhouseForm(target);
    case "lever":
      return fetchLeverForm(target);
    case "ashby":
      return fetchAshbyForm(target);
  }
}

const DECLINE_LABEL = /decline|don.?t wish|do not wish|prefer not|not to (answer|say|disclose)|choose not/i;

// Self-identification and legal attestations: only the user's saved answers may fill these.
const SENSITIVE_LABEL =
  /authori[sz]ed|sponsor|\bvisa\b|citizen|clearance|criminal|convict|felony|background check|gender|\brace\b|ethnic|hispanic|latin[oax]|veteran|disab|pronoun|sexual orientation|transgender|\bage\b|18 years|date of birth/i;

function field(
  partial: Omit<AutoApplyField, "value" | "source" | "sensitive" | "section"> & { section?: "main" | "eeo" },
): AutoApplyField {
  const section = partial.section ?? "main";
  return {
    ...partial,
    label: partial.label.replace(/\s+/g, " ").replace(/✱/g, "").trim(),
    section,
    value: partial.type === "multiselect" ? [] : "",
    source: "missing",
    sensitive: section === "eeo" || SENSITIVE_LABEL.test(partial.label),
  };
}

function withDecline(options: FieldOption[]): FieldOption[] {
  return options.map((o) => (o.decline || DECLINE_LABEL.test(o.label) ? { ...o, decline: true } : o));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Couldn't load the application form (${res.status}).`);
  return (await res.json()) as T;
}

// ── Greenhouse ──────────────────────────────────────────────────────────────

type GhField = { name: string; type: string; values?: Array<{ label: string; value: string | number }> };
type GhQuestion = { label: string; description?: string | null; required: boolean; fields: GhField[] };
type GhJob = {
  questions?: GhQuestion[];
  location_questions?: GhQuestion[];
  compliance?: Array<{ type: string; questions: GhQuestion[] }> | null;
  demographic_questions?: {
    questions: Array<{
      id: number;
      label: string;
      required: boolean;
      type: string;
      answer_options: Array<{ id: number; label: string; decline_to_answer?: boolean }>;
    }>;
  } | null;
};

const GH_TYPES: Record<string, FieldType> = {
  input_text: "text",
  textarea: "textarea",
  input_file: "file",
  multi_value_single_select: "select",
  multi_value_multi_select: "multiselect",
};

function mapGreenhouseQuestion(q: GhQuestion, section: "main" | "eeo"): AutoApplyField[] {
  const names = q.fields.map((f) => f.name);

  // Resume / cover letter come as a file input plus a "paste text" alternative.
  // Upload the resume file; for cover letters use the text box so AI can write one.
  if (names.includes("cover_letter_text")) {
    return [field({ key: "cover_letter_text", label: q.label, type: "textarea", required: q.required, section })];
  }

  return q.fields
    .filter((f) => f.type !== "input_hidden" && f.name !== "resume_text")
    .map((f) =>
      field({
        key: f.name,
        label: q.label,
        description: q.description ? cheerio.load(q.description).text().trim() || undefined : undefined,
        type: f.name === "location" ? "location" : GH_TYPES[f.type] ?? "text",
        required: q.required,
        options: f.values?.length
          ? withDecline(f.values.map((v) => ({ label: v.label, value: String(v.value) })))
          : undefined,
        section,
      }),
    );
}

async function fetchGreenhouseForm(target: AtsTarget): Promise<AutoApplyField[]> {
  const job = await fetchJson<GhJob>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(target.boardToken)}/jobs/${target.postingId}?questions=true`,
  );

  const fields: AutoApplyField[] = [
    ...(job.questions ?? []).flatMap((q) => mapGreenhouseQuestion(q, "main")),
    ...(job.location_questions ?? []).flatMap((q) => mapGreenhouseQuestion(q, "main")),
    ...(job.compliance ?? []).flatMap((c) => c.questions.flatMap((q) => mapGreenhouseQuestion(q, "eeo"))),
  ];

  for (const q of job.demographic_questions?.questions ?? []) {
    fields.push(
      field({
        key: `demographic_${q.id}`,
        label: q.label,
        type: q.type === "multi_value_multi_select" ? "multiselect" : "select",
        required: q.required,
        options: withDecline(
          q.answer_options.map((o) => ({ label: o.label, value: String(o.id), decline: o.decline_to_answer || undefined })),
        ),
        section: "eeo",
      }),
    );
  }

  return fields;
}

// ── Lever ───────────────────────────────────────────────────────────────────

type LeverTemplate = {
  text?: string;
  fields?: Array<{ type: string; text: string; description?: string; required?: boolean; options?: Array<{ text: string }> }>;
};

const LEVER_TYPES: Record<string, FieldType> = {
  "multiple-choice": "select",
  dropdown: "select",
  "multiple-select": "multiselect",
  text: "text",
  textarea: "textarea",
  "file-upload": "file",
};

// Standard Lever inputs worth filling. Pronouns, marketing consent, and the
// office-location picker are optional and left alone.
const LEVER_STANDARD = /^(name|email|phone|location|org|resume|comments|urls\[.+\])$/;

async function fetchLeverForm(target: AtsTarget): Promise<AutoApplyField[]> {
  const res = await fetch(target.formUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; HyrdBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Couldn't load the application form (${res.status}).`);
  const $ = cheerio.load(await res.text());
  const fields: AutoApplyField[] = [];
  const seen = new Set<string>();

  $("input[name], textarea[name], select[name]").each((_, el) => {
    const name = $(el).attr("name") ?? "";
    if (!LEVER_STANDARD.test(name) || seen.has(name)) return;
    if ($(el).attr("type") === "hidden") return;
    seen.add(name);

    const labelEl = $(el).closest(".application-question").find(".application-label").first();
    const label = labelEl.text() || name;
    const required = $(el).is("[required]") || labelEl.find(".required").length > 0;
    const type: FieldType =
      name === "resume" ? "file" : name === "location" ? "location" : el.tagName === "textarea" ? "textarea" : "text";
    fields.push(field({ key: name, label, type, required }));
  });

  // Custom questions ("cards") and surveys carry their full definition as JSON.
  $("input[name$='[baseTemplate]']").each((_, el) => {
    const name = $(el).attr("name") ?? "";
    const match = name.match(/^(cards|surveysResponses)\[([^\]]+)\]\[baseTemplate\]$/);
    if (!match) return;
    let template: LeverTemplate;
    try {
      template = JSON.parse($(el).attr("value") ?? "{}");
    } catch {
      return;
    }
    const [, kind, id] = match;
    (template.fields ?? []).forEach((f, i) => {
      const key = kind === "cards" ? `cards[${id}][field${i}]` : `surveysResponses[${id}][responses][field${i}]`;
      fields.push(
        field({
          key,
          label: f.text,
          description: f.description || undefined,
          type: LEVER_TYPES[f.type] ?? "text",
          required: Boolean(f.required),
          options: f.options?.length ? withDecline(f.options.map((o) => ({ label: o.text, value: o.text }))) : undefined,
          section: kind === "surveysResponses" ? "eeo" : "main",
        }),
      );
    });
  });

  // US EEO block (only on some postings).
  $("select[name^='eeo[']").each((_, el) => {
    const name = $(el).attr("name") ?? "";
    const label = $(el).closest(".application-question").find(".application-label").first().text() || name;
    const options = $(el)
      .find("option")
      .toArray()
      .map((o) => ({ label: $(o).text().trim(), value: $(o).attr("value") ?? "" }))
      .filter((o) => o.value);
    fields.push(field({ key: name, label, type: "select", required: false, options: withDecline(options), section: "eeo" }));
  });

  if (!fields.some((f) => f.key === "email")) {
    throw new Error("This Lever posting doesn't have an application form Hyrd can read.");
  }
  return fields;
}

// ── Ashby ───────────────────────────────────────────────────────────────────

type AshbyFieldEntry = {
  id: string;
  isRequired: boolean;
  isHidden?: boolean;
  descriptionHtml?: string | null;
  field: {
    path: string;
    title: string;
    type: string;
    selectableValues?: Array<{ label: string; value: string }>;
  };
};
type AshbySection = { title?: string | null; fieldEntries: AshbyFieldEntry[] };

const ASHBY_QUERY = `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
  jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
    id
    applicationForm { sections { title fieldEntries { ... on FormFieldEntry { id field isRequired descriptionHtml isHidden } } } }
    surveyForms { sections { title fieldEntries { ... on FormFieldEntry { id field isRequired descriptionHtml isHidden } } } }
  }
}`;

const ASHBY_TYPES: Record<string, FieldType> = {
  String: "text",
  Email: "text",
  Phone: "text",
  Number: "text",
  Date: "text",
  LongText: "textarea",
  File: "file",
  Boolean: "select",
  ValueSelect: "select",
  MultiValueSelect: "multiselect",
  Location: "location",
};

function mapAshbySections(sections: AshbySection[], section: "main" | "eeo"): AutoApplyField[] {
  return sections.flatMap((s) =>
    s.fieldEntries
      .filter((e) => e?.field && !e.isHidden)
      .map((e) => {
        const options =
          e.field.type === "Boolean"
            ? [
                { label: "Yes", value: "true" },
                { label: "No", value: "false" },
              ]
            : e.field.selectableValues?.map((v) => ({ label: v.label, value: v.value }));
        return field({
          key: e.field.path,
          label: e.field.title,
          description: e.descriptionHtml ? cheerio.load(e.descriptionHtml).text().trim() || undefined : undefined,
          type: ASHBY_TYPES[e.field.type] ?? "text",
          required: e.isRequired,
          options: options?.length ? withDecline(options) : undefined,
          section,
        });
      }),
  );
}

async function fetchAshbyForm(target: AtsTarget): Promise<AutoApplyField[]> {
  const body = await fetchJson<{
    data?: { jobPosting?: { applicationForm?: { sections: AshbySection[] }; surveyForms?: Array<{ sections: AshbySection[] }> } | null };
    errors?: unknown[];
  }>("https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "ApiJobPosting",
      variables: { organizationHostedJobsPageName: target.boardToken, jobPostingId: target.postingId },
      query: ASHBY_QUERY,
    }),
  });

  const posting = body.data?.jobPosting;
  if (!posting?.applicationForm) throw new Error("This Ashby posting is closed or has no application form.");

  return [
    ...mapAshbySections(posting.applicationForm.sections, "main"),
    ...(posting.surveyForms ?? []).flatMap((f) => mapAshbySections(f.sections, "eeo")),
  ];
}
