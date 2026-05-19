"use client";

import { useState, useTransition } from "react";
import { saveWorkExperience } from "@/app/actions/save-profile-structured";
import { parseResumeToStructured } from "@/app/actions/parse-resume";
import type { WorkExperienceEntry } from "@/lib/profile";

function newEntry(): WorkExperienceEntry {
  return {
    id: `exp-${Date.now()}`,
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    bullets: [""],
  };
}

function EntryCard({
  entry,
  onChange,
  onRemove,
}: {
  entry: WorkExperienceEntry;
  onChange: (updated: WorkExperienceEntry) => void;
  onRemove: () => void;
}) {
  const bulletsText = (entry.bullets ?? []).join("\n");

  return (
    <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Company
          <input value={entry.company} onChange={(e) => onChange({ ...entry, company: e.target.value })} placeholder="Company name" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Job title
          <input value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} placeholder="Software Engineer" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Start date
          <input value={entry.startDate} onChange={(e) => onChange({ ...entry, startDate: e.target.value })} placeholder="Jan 2022" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          End date
          <input value={entry.endDate} onChange={(e) => onChange({ ...entry, endDate: e.target.value })} placeholder="Present" />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        Location
        <input value={entry.location ?? ""} onChange={(e) => onChange({ ...entry, location: e.target.value })} placeholder="City, State or Remote" />
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        Bullets (one per line)
        <textarea
          value={bulletsText}
          onChange={(e) => onChange({ ...entry, bullets: e.target.value.split("\n") })}
          rows={4}
          placeholder={"Built X using Y which resulted in Z\nLed a team of N engineers to ship..."}
          style={{ resize: "vertical", fontSize: 13 }}
        />
      </label>
      <button type="button" className="button secondary" onClick={onRemove} style={{ fontSize: 12, color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}>
        Remove entry
      </button>
    </div>
  );
}

export function WorkExperienceEditor({
  initialEntries,
  resumeText,
}: {
  initialEntries: WorkExperienceEntry[];
  resumeText?: string;
}) {
  const [entries, setEntries] = useState<WorkExperienceEntry[]>(initialEntries);
  const [isSaving, startSave] = useTransition();
  const [isParsing, startParse] = useTransition();
  const [parseError, setParseError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateEntry(id: string, updated: WorkExperienceEntry) {
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSave() {
    setSaved(false);
    startSave(async () => {
      await saveWorkExperience(entries);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleParse() {
    if (!resumeText?.trim()) return;
    setParseError("");
    startParse(async () => {
      const result = await parseResumeToStructured(resumeText);
      if (result.ok && result.data.workExperience.length > 0) {
        setEntries(result.data.workExperience);
      } else if (!result.ok) {
        setParseError(result.error);
      } else {
        setParseError("No work experience found in the resume text.");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {resumeText?.trim() && (
          <button type="button" className="button secondary" onClick={handleParse} disabled={isParsing} style={{ fontSize: 13 }}>
            {isParsing ? "Parsing resume…" : "Extract from resume"}
          </button>
        )}
        <button type="button" className="button secondary" onClick={() => setEntries((p) => [...p, newEntry()])} style={{ fontSize: 13 }}>
          + Add entry
        </button>
      </div>
      {parseError && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{parseError}</p>}

      {entries.length === 0 && (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          No work experience added yet. Click "Extract from resume" or "Add entry" to start.
        </p>
      )}

      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onChange={(updated) => updateEntry(entry.id, updated)}
          onRemove={() => removeEntry(entry.id)}
        />
      ))}

      {entries.length > 0 && (
        <button type="button" className="button" onClick={handleSave} disabled={isSaving} style={{ justifyContent: "center" }}>
          {isSaving ? "Saving…" : saved ? "Saved!" : "Save work experience"}
        </button>
      )}
    </div>
  );
}
