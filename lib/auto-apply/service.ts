import { ApplicationStatus, AutoApplyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserProfileByUserId } from "@/lib/profile";
import { detectAtsTarget } from "@/lib/auto-apply/detect";
import { fetchApplicationForm } from "@/lib/auto-apply/forms";
import { applyKnownAnswers, missingRequired } from "@/lib/auto-apply/answers";
import { draftAiAnswers } from "@/lib/auto-apply/ai";
import { parseFields, parseSavedAnswers, savedAnswersSchema, type AutoApplyField, type SavedAnswers } from "@/lib/auto-apply/types";

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

const DAILY_LIMIT = Number.parseInt(process.env.AUTO_APPLY_DAILY_LIMIT ?? "25", 10) || 25;
const MAX_TEXT = 5000;

// ── Settings (saved answers + resume file) ──────────────────────────────────

export async function getAutoApplySettings(userId: string) {
  const row = await prisma.autoApplySettings.findUnique({
    where: { userId },
    select: { answers: true, resumeFileName: true, resumeUpdatedAt: true },
  });
  return {
    answers: parseSavedAnswers(row?.answers),
    hasResume: Boolean(row?.resumeFileName),
    resumeFileName: row?.resumeFileName ?? null,
    resumeUpdatedAt: row?.resumeUpdatedAt ?? null,
  };
}

export async function saveSavedAnswers(userId: string, input: unknown): Promise<Result> {
  const parsed = savedAnswersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some answers are invalid. Check the form and try again." };
  const answers = JSON.stringify(parsed.data);
  await prisma.autoApplySettings.upsert({
    where: { userId },
    create: { userId, answers },
    update: { answers },
  });
  return { ok: true };
}

export async function saveResumeFile(userId: string, file: { data: Buffer; fileName: string; type: string }) {
  const data = {
    resumeFile: new Uint8Array(file.data),
    resumeFileName: file.fileName,
    resumeFileType: file.type || "application/octet-stream",
    resumeUpdatedAt: new Date(),
  };
  await prisma.autoApplySettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

// ── Prepare → review → approve ──────────────────────────────────────────────

export async function prepareAutoApply(userId: string, jobId: string): Promise<Result<{ id: string }>> {
  const existing = await prisma.autoApply.findUnique({
    where: { userId_jobId: { userId, jobId } },
    select: { id: true, status: true },
  });
  // Anything still in flight (or already sent) is reused rather than re-drafted.
  if (existing && !(["FAILED", "CANCELLED", "NEEDS_MANUAL"] as AutoApplyStatus[]).includes(existing.status)) {
    return { ok: true, id: existing.id };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Job not found." };

  const target = await detectAtsTarget(job);
  if (!target) {
    return {
      ok: false,
      error: "Auto-apply works with Greenhouse, Lever, and Ashby application forms. This job uses a different system — use Apply instead.",
    };
  }

  let fields: AutoApplyField[];
  try {
    fields = await fetchApplicationForm(target);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't load the application form." };
  }

  const [profile, settings] = await Promise.all([getUserProfileByUserId(userId), getAutoApplySettings(userId)]);
  fields = applyKnownAnswers(fields, {
    profile,
    saved: settings.answers,
    hasResume: settings.hasResume,
    jobCompany: job.company,
  });
  fields = await draftAiAnswers(fields, job, profile);

  const data = {
    ats: target.ats,
    boardToken: target.boardToken,
    postingId: target.postingId,
    formUrl: target.formUrl,
    status: AutoApplyStatus.NEEDS_REVIEW,
    fields: JSON.stringify(fields),
    error: null,
    screenshot: null,
    submittedAt: null,
  };
  const row = await prisma.autoApply.upsert({
    where: { userId_jobId: { userId, jobId } },
    create: { userId, jobId, ...data },
    update: data,
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

/** Applies the user's edits from the review page. Unknown keys and invalid options are ignored. */
function mergeValues(fields: AutoApplyField[], values: Record<string, unknown>): AutoApplyField[] {
  return fields.map((field) => {
    if (!(field.key in values)) return field;
    const raw = values[field.key];
    let value: string | string[];
    if (field.type === "multiselect") {
      const allowed = new Set(field.options?.map((o) => o.value));
      value = (Array.isArray(raw) ? raw : []).map(String).filter((v) => allowed.has(v));
    } else if (field.type === "select") {
      const v = String(raw ?? "");
      value = field.options?.some((o) => o.value === v) ? v : "";
    } else if (field.type === "file") {
      return field; // files are attached by the worker, not editable here
    } else {
      value = String(raw ?? "").slice(0, MAX_TEXT);
    }
    const changed = JSON.stringify(value) !== JSON.stringify(field.value);
    return changed ? { ...field, value, source: "user" as const } : field;
  });
}

/** Picks up a resume uploaded after the application was prepared. */
export function attachResume(fields: AutoApplyField[], hasResume: boolean): AutoApplyField[] {
  if (!hasResume) return fields;
  return fields.map((f) =>
    f.type === "file" && !f.value && /resume|cv\b/i.test(`${f.key} ${f.label}`)
      ? { ...f, value: "resume", source: "saved" as const }
      : f,
  );
}

async function getOwned(userId: string, id: string) {
  return prisma.autoApply.findFirst({ where: { id, userId } });
}

export async function updateAutoApplyFields(userId: string, id: string, values: Record<string, unknown>): Promise<Result> {
  const row = await getOwned(userId, id);
  if (!row) return { ok: false, error: "Not found." };
  if (row.status !== "NEEDS_REVIEW") return { ok: false, error: "This application can no longer be edited." };
  const fields = mergeValues(parseFields(row.fields), values);
  await prisma.autoApply.update({ where: { id }, data: { fields: JSON.stringify(fields) } });
  return { ok: true };
}

export async function approveAutoApply(userId: string, id: string, values: Record<string, unknown>): Promise<Result> {
  const row = await getOwned(userId, id);
  if (!row) return { ok: false, error: "Not found." };
  if (row.status !== "NEEDS_REVIEW") return { ok: false, error: "This application was already sent for submission." };

  const { hasResume } = await getAutoApplySettings(userId);
  const fields = attachResume(mergeValues(parseFields(row.fields), values), hasResume);
  const missing = missingRequired(fields);
  if (missing.length) {
    await prisma.autoApply.update({ where: { id }, data: { fields: JSON.stringify(fields) } });
    return { ok: false, error: `Fill in the required questions first: ${missing.map((f) => f.label).slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}` };
  }

  const recent = await prisma.autoApply.count({
    where: {
      userId,
      status: { in: ["QUEUED", "SUBMITTING", "SUBMITTED"] },
      updatedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent >= DAILY_LIMIT) {
    return { ok: false, error: `You've reached today's limit of ${DAILY_LIMIT} auto-applications. Try again tomorrow.` };
  }

  await prisma.autoApply.update({
    where: { id },
    data: { fields: JSON.stringify(fields), status: "QUEUED", error: null },
  });
  return { ok: true };
}

export async function cancelAutoApply(userId: string, id: string): Promise<Result> {
  const row = await getOwned(userId, id);
  if (!row) return { ok: false, error: "Not found." };
  if (!(["NEEDS_REVIEW", "QUEUED", "NEEDS_MANUAL", "FAILED"] as AutoApplyStatus[]).includes(row.status)) {
    return { ok: false, error: "This application is already being submitted." };
  }
  await prisma.autoApply.update({ where: { id }, data: { status: "CANCELLED" } });
  return { ok: true };
}

export async function getAutoApplyForUser(userId: string, id: string) {
  const row = await prisma.autoApply.findFirst({
    where: { id, userId },
    select: {
      id: true, status: true, ats: true, formUrl: true, fields: true, error: true,
      attempts: true, submittedAt: true, createdAt: true, updatedAt: true,
      job: { select: { id: true, title: true, company: true, location: true } },
    },
  });
  return row ? { ...row, fields: parseFields(row.fields) } : null;
}

export async function listAutoAppliesForUser(userId: string) {
  return prisma.autoApply.findMany({
    where: { userId, status: { not: "CANCELLED" } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true, status: true, ats: true, error: true, updatedAt: true, submittedAt: true,
      job: { select: { id: true, title: true, company: true } },
    },
  });
}

// ── Submit worker hand-off ──────────────────────────────────────────────────

// A worker that crashes mid-submit leaves rows in SUBMITTING; after this long
// they're treated as abandoned and handed to the user instead of retried, since
// the form may have actually gone through.
const STALE_SUBMIT_MS = 15 * 60 * 1000;

export async function claimNextAutoApply() {
  await prisma.autoApply.updateMany({
    where: { status: "SUBMITTING", updatedAt: { lt: new Date(Date.now() - STALE_SUBMIT_MS) } },
    data: { status: "NEEDS_MANUAL", error: "Submission timed out. Check your email for a confirmation before applying again." },
  });

  const next = await prisma.autoApply.findFirst({
    where: { status: "QUEUED" },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });
  if (!next) return null;

  // Conditional update so two workers can't claim the same row.
  const claimed = await prisma.autoApply.updateMany({
    where: { id: next.id, status: "QUEUED" },
    data: { status: "SUBMITTING", attempts: { increment: 1 } },
  });
  if (!claimed.count) return null;

  const row = await prisma.autoApply.findUniqueOrThrow({
    where: { id: next.id },
    select: { id: true, userId: true, ats: true, formUrl: true, fields: true },
  });
  const settings = await prisma.autoApplySettings.findUnique({
    where: { userId: row.userId },
    select: { resumeFile: true, resumeFileName: true, resumeFileType: true, answers: true },
  });

  return {
    id: row.id,
    ats: row.ats,
    formUrl: row.formUrl,
    fields: parseFields(row.fields),
    // Phone fields on some forms carry a separate country-code picker.
    applicant: { country: parseSavedAnswers(settings?.answers).country || "United States" },
    resume: settings?.resumeFile
      ? {
          fileName: settings.resumeFileName ?? "resume.pdf",
          mimeType: settings.resumeFileType ?? "application/pdf",
          base64: Buffer.from(settings.resumeFile).toString("base64"),
        }
      : null,
  };
}

export type WorkerResult = {
  status: "SUBMITTED" | "NEEDS_MANUAL" | "FAILED";
  error?: string;
  screenshotBase64?: string;
};

export async function recordAutoApplyResult(id: string, result: WorkerResult) {
  const row = await prisma.autoApply.findUnique({
    where: { id },
    select: { status: true, userId: true, jobId: true, job: true },
  });
  if (!row || row.status !== "SUBMITTING") return { ok: false as const, error: "Not in a submittable state." };

  await prisma.autoApply.update({
    where: { id },
    data: {
      status: result.status,
      error: result.error?.slice(0, 1000) ?? null,
      screenshot: result.screenshotBase64 ? new Uint8Array(Buffer.from(result.screenshotBase64, "base64")) : undefined,
      submittedAt: result.status === "SUBMITTED" ? new Date() : null,
    },
  });

  if (result.status === "SUBMITTED") {
    const existing = await prisma.application.findFirst({ where: { userId: row.userId, jobId: row.jobId } });
    const note = "Submitted with Hyrd auto-apply.";
    if (existing) {
      await prisma.application.update({
        where: { id: existing.id },
        data: {
          status: ApplicationStatus.APPLIED,
          dateApplied: existing.dateApplied ?? new Date(),
          notes: existing.notes ? `${existing.notes}\n${note}` : note,
        },
      });
    } else {
      await prisma.application.create({
        data: {
          userId: row.userId,
          jobId: row.jobId,
          company: row.job.company,
          roleTitle: row.job.title,
          sourceUrl: row.job.sourceUrl,
          applyUrl: row.job.applyUrl,
          status: ApplicationStatus.APPLIED,
          dateApplied: new Date(),
          notes: note,
        },
      });
    }
  }
  return { ok: true as const };
}

export type { SavedAnswers };
