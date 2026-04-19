"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WORKPLACE_TYPES = ["UNKNOWN", "REMOTE", "HYBRID", "ONSITE"];
const EMPLOYMENT_TYPES = ["UNKNOWN", "FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"];
const EXPERIENCE_LEVELS = ["UNKNOWN", "INTERN", "ENTRY", "MID", "SENIOR", "LEAD"];

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function JobDetailEditor({
  jobId,
  workplaceType,
  employmentType,
  experienceLevel,
  location,
}: {
  jobId: string;
  workplaceType: string;
  employmentType: string;
  experienceLevel: string;
  location: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fields, setFields] = useState({
    workplaceType,
    employmentType,
    experienceLevel,
    location: location ?? "",
  });

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="stack compact-stack">
      <div>
        <h2 className="section-title">Edit job details</h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Correct workplace type, employment type, experience level, or location if the source data is wrong.
        </p>
      </div>

      <div className="stack compact-stack">
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow">Workplace type</span>
          <select
            value={fields.workplaceType}
            onChange={(e) => setFields((f) => ({ ...f, workplaceType: e.target.value }))}
            className="input"
          >
            {WORKPLACE_TYPES.map((v) => (
              <option key={v} value={v}>{label(v)}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow">Employment type</span>
          <select
            value={fields.employmentType}
            onChange={(e) => setFields((f) => ({ ...f, employmentType: e.target.value }))}
            className="input"
          >
            {EMPLOYMENT_TYPES.map((v) => (
              <option key={v} value={v}>{label(v)}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow">Experience level</span>
          <select
            value={fields.experienceLevel}
            onChange={(e) => setFields((f) => ({ ...f, experienceLevel: e.target.value }))}
            className="input"
          >
            {EXPERIENCE_LEVELS.map((v) => (
              <option key={v} value={v}>{label(v)}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow">Location</span>
          <input
            type="text"
            value={fields.location}
            onChange={(e) => setFields((f) => ({ ...f, location: e.target.value }))}
            className="input"
            placeholder="e.g. Remote, New York NY, Durham NC"
          />
        </label>
      </div>

      <div className="actions">
        <button className="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="muted">Saved</span>}
      </div>
    </div>
  );
}
