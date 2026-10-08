"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cancelAutoApplyAction,
  saveAutoApplyDraft,
  startAutoApply,
  submitAutoApply,
} from "@/app/actions/auto-apply";
import type { AnswerSource, AutoApplyField } from "@/lib/auto-apply/types";

type Values = Record<string, string | string[]>;

const SOURCE_BADGE: Record<AnswerSource, { label: string; color: string } | null> = {
  profile: { label: "From profile", color: "#9ca3af" },
  saved: { label: "Saved answer", color: "#9ca3af" },
  rule: { label: "Auto", color: "#9ca3af" },
  ai: { label: "AI draft — check it", color: "#c084fc" },
  user: { label: "Edited", color: "#60a5fa" },
  missing: null,
  skipped: null,
};

function isBlank(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.length === 0 : !value?.trim();
}

function displayValue(field: AutoApplyField, value: string | string[]) {
  if (field.type === "file") return value ? "Your resume file" : "—";
  if (!field.options?.length) return (Array.isArray(value) ? value.join(", ") : value) || "—";
  const values = Array.isArray(value) ? value : [value];
  return values.map((v) => field.options!.find((o) => o.value === v)?.label ?? v).filter(Boolean).join(", ") || "—";
}

function FieldInput({
  field,
  value,
  onChange,
  resumeFileName,
}: {
  field: AutoApplyField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  resumeFileName: string | null;
}) {
  if (field.type === "file") {
    return (
      <div className="inset-card" style={{ padding: "9px 12px", fontSize: 13 }}>
        {value === "resume" && resumeFileName ? (
          <>📎 {resumeFileName}</>
        ) : (
          <span style={{ color: "#f87171" }}>
            No resume file saved. <Link href="/auto-apply" style={{ textDecoration: "underline" }}>Upload one</Link>, then try again.
          </span>
        )}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "multiselect") {
    const selected = new Set(Array.isArray(value) ? value : []);
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {field.options?.map((o) => (
          <label key={o.value} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={selected.has(o.value)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(o.value);
                else next.delete(o.value);
                onChange([...next]);
              }}
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === "textarea") {
    return <textarea rows={7} value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
}

export function AutoApplyReview({
  id,
  jobId,
  status,
  formUrl,
  error: statusError,
  fields,
  resumeFileName,
  hasScreenshot,
}: {
  id: string;
  jobId: string;
  status: string;
  formUrl: string;
  error: string | null;
  fields: AutoApplyField[];
  resumeFileName: string | null;
  hasScreenshot: boolean;
}) {
  const router = useRouter();
  const editable = status === "NEEDS_REVIEW";
  const [values, setValues] = useState<Values>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [showSkipped, setShowSkipped] = useState(false);

  // While the worker has it, poll so the page flips to Submitted on its own.
  useEffect(() => {
    if (status !== "QUEUED" && status !== "SUBMITTING") return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [status, router]);

  const needsYou = useMemo(
    () => fields.filter((f) => f.required && isBlank(values[f.key])),
    [fields, values],
  );
  const main = fields.filter((f) => f.section === "main" && (showSkipped || f.source !== "skipped" || !isBlank(values[f.key])));
  const eeo = fields.filter((f) => f.section === "eeo");
  const skippedCount = fields.filter((f) => f.section === "main" && f.source === "skipped" && isBlank(values[f.key])).length;

  const setValue = (key: string, value: string | string[]) => setValues((v) => ({ ...v, [key]: value }));

  function run(action: () => Promise<{ ok: boolean; error?: string }>, okText?: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setMessage({ kind: "error", text: result.error ?? "Something went wrong." });
      else {
        if (okText) setMessage({ kind: "ok", text: okText });
        router.refresh();
      }
    });
  }

  function retry() {
    setMessage(null);
    startTransition(async () => {
      const result = await startAutoApply(jobId);
      if (result.ok) router.push(`/auto-apply/${result.id}`);
      else setMessage({ kind: "error", text: result.error });
    });
  }

  function renderField(field: AutoApplyField) {
    const value = values[field.key] ?? "";
    const blank = isBlank(value);
    const badge = field.required && blank ? { label: "Needs your answer", color: "#f87171" } : SOURCE_BADGE[field.source];
    return (
      <div key={field.key} style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>
            {field.label}
            {field.required && <span style={{ color: "#ff3368" }}> *</span>}
          </label>
          {badge && <span style={{ fontSize: 11, fontWeight: 600, color: badge.color }}>{badge.label}</span>}
        </div>
        {field.description && <p className="muted" style={{ margin: 0, fontSize: 12 }}>{field.description.slice(0, 300)}</p>}
        {editable ? (
          <FieldInput field={field} value={value} onChange={(v) => setValue(field.key, v)} resumeFileName={resumeFileName} />
        ) : (
          <div className="inset-card" style={{ padding: "9px 12px", fontSize: 13, whiteSpace: "pre-wrap" }}>
            {field.type === "file" && resumeFileName ? `📎 ${resumeFileName}` : displayValue(field, value)}
          </div>
        )}
        {editable && field.sensitive && field.section === "main" && blank && (
          <p className="muted" style={{ margin: 0, fontSize: 11 }}>
            Hyrd never guesses this. <Link href="/auto-apply" style={{ textDecoration: "underline" }}>Save it in your answers</Link> to fill it automatically next time.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {status === "QUEUED" || status === "SUBMITTING" ? (
        <div className="card" style={{ padding: "14px 16px", borderColor: "rgba(96,165,250,0.3)" }}>
          <strong>Submitting your application…</strong>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            This page updates on its own. You can leave — it'll show up in your tracker once it's sent.
          </p>
        </div>
      ) : status === "SUBMITTED" ? (
        <div className="card" style={{ padding: "14px 16px", borderColor: "rgba(74,222,128,0.3)", display: "grid", gap: 10 }}>
          <strong style={{ color: "#4ade80" }}>Application submitted ✓</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            It's been added to your tracker as Applied. Watch your inbox for the company's confirmation email.
          </p>
          {hasScreenshot && (
            <a href={`/api/auto-apply/${id}/screenshot`} target="_blank" rel="noreferrer" className="button secondary" style={{ justifySelf: "start", fontSize: 13 }}>
              View confirmation screenshot
            </a>
          )}
        </div>
      ) : status === "NEEDS_MANUAL" || status === "FAILED" ? (
        <div className="card" style={{ padding: "14px 16px", borderColor: "rgba(249,115,22,0.3)", display: "grid", gap: 10 }}>
          <strong style={{ color: "#fb923c" }}>This one needs you to finish it</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {statusError ?? "The application couldn't be submitted automatically."} Your answers are below — open the form and copy them in.
          </p>
          <div className="actions">
            <a className="button" href={formUrl} target="_blank" rel="noreferrer">Open the application form</a>
            <button className="button secondary" onClick={retry} disabled={pending}>Start over</button>
          </div>
        </div>
      ) : status === "CANCELLED" ? (
        <div className="card" style={{ padding: "14px 16px" }}>
          <strong>Cancelled</strong>
          <div className="actions" style={{ marginTop: 10 }}>
            <button className="button secondary" onClick={retry} disabled={pending}>Start over</button>
          </div>
        </div>
      ) : needsYou.length > 0 ? (
        <div className="card" style={{ padding: "14px 16px", borderColor: "rgba(248,113,113,0.3)" }}>
          <strong>{needsYou.length} question{needsYou.length === 1 ? "" : "s"} need{needsYou.length === 1 ? "s" : ""} your answer</strong>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {needsYou.map((f) => f.label).slice(0, 4).join(" · ")}{needsYou.length > 4 ? " · …" : ""}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: "14px 16px", borderColor: "rgba(74,222,128,0.25)" }}>
          <strong>Everything's filled in.</strong>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Skim the answers — especially the purple AI drafts — then hit Submit.
          </p>
        </div>
      )}

      <section className="card" style={{ padding: "16px 18px", display: "grid", gap: 16 }}>
        <h2 className="section-title" style={{ fontSize: "1rem" }}>Application</h2>
        {main.map(renderField)}
        {skippedCount > 0 && (
          <button
            className="button secondary"
            style={{ justifySelf: "start", fontSize: 12, minHeight: 34 }}
            onClick={() => setShowSkipped((s) => !s)}
          >
            {showSkipped ? "Hide optional blank questions" : `Show ${skippedCount} optional question${skippedCount === 1 ? "" : "s"} left blank`}
          </button>
        )}
      </section>

      {eeo.length > 0 && (
        <section className="card" style={{ padding: "16px 18px", display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <h2 className="section-title" style={{ fontSize: "1rem" }}>Voluntary self-identification</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Filled from your saved preferences (default: decline to answer). Employers can't use these in hiring decisions.
            </p>
          </div>
          {eeo.map(renderField)}
        </section>
      )}

      {message && (
        <p style={{ margin: 0, fontSize: 13, color: message.kind === "error" ? "#f87171" : "#4ade80" }}>{message.text}</p>
      )}

      {editable && (
        <div
          className="actions"
          style={{
            position: "sticky",
            bottom: 12,
            zIndex: 5,
            padding: 10,
            borderRadius: 16,
            background: "var(--panel-strong)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <button
            className="button"
            disabled={pending || needsYou.length > 0}
            onClick={() => run(() => submitAutoApply(id, values))}
          >
            {pending ? "Working…" : "Submit application"}
          </button>
          <button className="button secondary" disabled={pending} onClick={() => run(() => saveAutoApplyDraft(id, values), "Saved.")}>
            Save draft
          </button>
          <button
            className="button secondary"
            disabled={pending}
            onClick={() => run(async () => {
              const result = await cancelAutoApplyAction(id);
              if (result.ok) router.push("/auto-apply");
              return result;
            })}
          >
            Cancel
          </button>
          <a className="button secondary" href={formUrl} target="_blank" rel="noreferrer">View original form</a>
        </div>
      )}
    </div>
  );
}
