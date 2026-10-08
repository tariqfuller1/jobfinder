"use client";

import { useState, useTransition } from "react";
import { saveAutoApplyAnswers } from "@/app/actions/auto-apply";
import type { SavedAnswers } from "@/lib/auto-apply/types";

type Placeholders = Partial<Record<keyof SavedAnswers, string>>;

const YES_NO = [
  { value: "", label: "— Not set —" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const EEO_OPTIONS: Partial<Record<keyof SavedAnswers, Array<{ value: string; label: string }>>> = {
  gender: [
    { value: "decline", label: "Decline to answer" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "nonbinary", label: "Non-binary" },
  ],
  hispanicLatino: [
    { value: "decline", label: "Decline to answer" },
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
  race: [
    { value: "decline", label: "Decline to answer" },
    { value: "american_indian", label: "American Indian or Alaska Native" },
    { value: "asian", label: "Asian" },
    { value: "black", label: "Black or African American" },
    { value: "hispanic", label: "Hispanic or Latino" },
    { value: "pacific_islander", label: "Native Hawaiian or Other Pacific Islander" },
    { value: "white", label: "White" },
    { value: "two_or_more", label: "Two or more races" },
  ],
  veteran: [
    { value: "decline", label: "Decline to answer" },
    { value: "no", label: "I am not a protected veteran" },
    { value: "yes", label: "I am a protected veteran" },
  ],
  disability: [
    { value: "decline", label: "Decline to answer" },
    { value: "no", label: "No, I don't have a disability" },
    { value: "yes", label: "Yes, I have a disability" },
  ],
};

export function AutoApplySettingsForm({
  initial,
  placeholders,
}: {
  initial: SavedAnswers;
  placeholders: Placeholders;
}) {
  const [answers, setAnswers] = useState<SavedAnswers>(initial);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof SavedAnswers>(key: K, value: SavedAnswers[K]) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const text = (key: keyof SavedAnswers, label: string, hint?: string) => (
    <label style={{ display: "grid", gap: 5, fontSize: 13 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        type="text"
        value={String(answers[key] ?? "")}
        placeholder={placeholders[key] ?? hint ?? ""}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </label>
  );

  const choice = (key: keyof SavedAnswers, label: string, options = YES_NO) => (
    <label style={{ display: "grid", gap: 5, fontSize: 13 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <select value={String(answers[key] ?? "")} onChange={(e) => set(key, e.target.value as never)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveAutoApplyAnswers(answers);
      setMessage(result.ok ? { kind: "ok", text: "Saved." } : { kind: "error", text: result.error });
    });
  }

  const group = (title: string, note: string | null, children: React.ReactNode) => (
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        <div className="eyebrow">{title}</div>
        {note && <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>{note}</p>}
      </div>
      <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {group(
        "Work eligibility",
        "Hyrd never guesses these. If one is blank, you'll be asked on every application that needs it.",
        <>
          {choice("workAuthorizedUS", "Authorized to work in the US?")}
          {choice("requiresSponsorship", "Will you need visa sponsorship?")}
          {choice("over18", "Are you 18 or older?")}
          {choice("willingToRelocate", "Willing to relocate?")}
          {choice("openToOnsite", "Open to on-site / hybrid work?")}
        </>,
      )}

      {group(
        "Contact & location",
        "Blank fields fall back to your profile (shown in grey).",
        <>
          {text("phone", "Phone")}
          {text("city", "City")}
          {text("state", "State")}
          {text("country", "Country")}
        </>,
      )}

      {group(
        "Current role & links",
        null,
        <>
          {text("currentCompany", "Current / most recent company")}
          {text("currentTitle", "Current / most recent title")}
          {text("linkedinUrl", "LinkedIn URL")}
          {text("githubUrl", "GitHub URL")}
          {text("portfolioUrl", "Portfolio / website")}
        </>,
      )}

      {group(
        "Common questions",
        null,
        <>
          {text("salaryExpectation", "Salary expectation", "e.g. $120,000")}
          {text("startDate", "Start date / notice period", "e.g. 2 weeks")}
          {text("yearsExperience", "Years of professional experience", "e.g. 3")}
          {text("howDidYouHear", "How did you hear about the job?")}
        </>,
      )}

      {group(
        "Voluntary self-identification (EEO)",
        "Used only for the optional EEO section of applications. Employers can't use these in hiring decisions.",
        <>
          {choice("gender", "Gender", EEO_OPTIONS.gender)}
          {choice("hispanicLatino", "Hispanic or Latino?", EEO_OPTIONS.hispanicLatino)}
          {choice("race", "Race", EEO_OPTIONS.race)}
          {choice("veteran", "Veteran status", EEO_OPTIONS.veteran)}
          {choice("disability", "Disability status", EEO_OPTIONS.disability)}
          {text("pronouns", "Pronouns (optional)")}
        </>,
      )}

      <div className="actions" style={{ alignItems: "center" }}>
        <button className="button" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save answers"}</button>
        {message && (
          <span style={{ fontSize: 13, color: message.kind === "ok" ? "#4ade80" : "#f87171" }}>{message.text}</span>
        )}
      </div>
    </div>
  );
}
