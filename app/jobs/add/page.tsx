"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const WORKPLACE_OPTIONS = [
  { value: "UNKNOWN", label: "Not specified" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "On-site" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "UNKNOWN", label: "Not specified" },
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "TEMPORARY", label: "Temporary" },
];

const EXPERIENCE_OPTIONS = [
  { value: "UNKNOWN", label: "Not specified" },
  { value: "INTERN", label: "Intern" },
  { value: "ENTRY", label: "Entry-level" },
  { value: "MID", label: "Mid-level" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead / Manager" },
];

const BLANK = {
  title: "",
  company: "",
  applyUrl: "",
  location: "",
  workplaceType: "UNKNOWN",
  employmentType: "UNKNOWN",
  experienceLevel: "UNKNOWN",
  descriptionText: "",
};

export default function AddJobPage() {
  const router = useRouter();
  const [form, setForm] = useState(BLANK);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function field(key: keyof typeof BLANK) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim() || !form.applyUrl.trim()) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Failed to add job.");
        return;
      }
      const job = await res.json();
      router.push(`/jobs/${job.id}`);
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ padding: "24px 0 48px", display: "grid", gap: 16, maxWidth: 680 }}>
      <div>
        <Link href="/jobs" style={{ fontSize: 13, color: "#6b7280" }}>← Back to jobs</Link>
      </div>

      <div className="card hero-card" style={{ padding: "20px 22px" }}>
        <h1 className="section-title">Add a job manually</h1>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
          Found a role elsewhere? Add it here so you can run the ATS check, generate a cover letter, and track your application.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: "20px 22px", display: "grid", gap: 16 }}>
        {/* Required fields */}
        <div style={{ display: "grid", gap: 14 }}>
          <div className="eyebrow">Required</div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>Job title</label>
            <input
              required
              value={form.title}
              onChange={field("title")}
              placeholder="e.g. Game Designer"
              style={{ fontSize: 14 }}
            />
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>Company</label>
            <input
              required
              value={form.company}
              onChange={field("company")}
              placeholder="e.g. Riot Games"
              style={{ fontSize: 14 }}
            />
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>Apply URL</label>
            <input
              required
              type="url"
              value={form.applyUrl}
              onChange={field("applyUrl")}
              placeholder="https://..."
              style={{ fontSize: 14 }}
            />
          </div>
        </div>

        {/* Optional metadata */}
        <div style={{ display: "grid", gap: 14 }}>
          <div className="eyebrow">Optional details</div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>Location</label>
            <input
              value={form.location}
              onChange={field("location")}
              placeholder="e.g. Los Angeles, CA or Remote"
              style={{ fontSize: 14 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ fontSize: 12, color: "#9ca3af" }}>Workplace</label>
              <select value={form.workplaceType} onChange={field("workplaceType")} style={{ fontSize: 13 }}>
                {WORKPLACE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ fontSize: 12, color: "#9ca3af" }}>Employment</label>
              <select value={form.employmentType} onChange={field("employmentType")} style={{ fontSize: 13 }}>
                {EMPLOYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ fontSize: 12, color: "#9ca3af" }}>Experience</label>
              <select value={form.experienceLevel} onChange={field("experienceLevel")} style={{ fontSize: 13 }}>
                {EXPERIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
            Job description
            <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 8, fontSize: 12 }}>
              Paste the full posting — used by the ATS checker and cover letter generator
            </span>
          </label>
          <textarea
            value={form.descriptionText}
            onChange={field("descriptionText")}
            placeholder="Paste the job description here…"
            rows={12}
            className="letter-textarea"
            style={{ fontSize: 13 }}
          />
        </div>

        {error && <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>}

        <div className="actions">
          <button type="submit" className="button" disabled={pending} style={{ fontSize: 14 }}>
            {pending ? "Saving…" : "Add job"}
          </button>
          <Link href="/jobs" className="button secondary" style={{ fontSize: 14 }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
