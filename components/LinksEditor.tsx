"use client";

import { useState } from "react";
import type { ProfileLink } from "@/lib/profile";

const PRESETS = [
  { label: "LinkedIn", placeholder: "https://linkedin.com/in/yourname" },
  { label: "GitHub", placeholder: "https://github.com/yourname" },
  { label: "Portfolio", placeholder: "https://yourportfolio.com" },
  { label: "Resume (PDF)", placeholder: "https://drive.google.com/..." },
  { label: "Twitter / X", placeholder: "https://x.com/yourname" },
  { label: "Dribbble", placeholder: "https://dribbble.com/yourname" },
  { label: "Behance", placeholder: "https://behance.net/yourname" },
  { label: "Itch.io", placeholder: "https://yourname.itch.io" },
  { label: "ArtStation", placeholder: "https://artstation.com/yourname" },
  { label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { label: "Blog", placeholder: "https://yourblog.com" },
  { label: "Other", placeholder: "https://" },
];

export function LinksEditor({ initialLinks }: { initialLinks: ProfileLink[] }) {
  const [links, setLinks] = useState<ProfileLink[]>(initialLinks);
  const [newLabel, setNewLabel] = useState("LinkedIn");
  const [newUrl, setNewUrl] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preset = PRESETS.find((p) => p.label === newLabel);
  const effectiveLabel = newLabel === "Other" ? customLabel : newLabel;
  const urlPlaceholder = preset?.placeholder ?? "https://";

  async function save(updated: ProfileLink[]) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save links.");
      setLinks(updated);
      setMessage("Links saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save links.");
    } finally {
      setSaving(false);
    }
  }

  function addLink() {
    const label = effectiveLabel.trim();
    const url = newUrl.trim();
    if (!label || !url) return;
    const updated = [...links, { label, url }];
    setNewUrl("");
    setCustomLabel("");
    save(updated);
  }

  function removeLink(index: number) {
    const updated = links.filter((_, i) => i !== index);
    save(updated);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const updated = [...links];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    save(updated);
  }

  function moveDown(index: number) {
    if (index === links.length - 1) return;
    const updated = [...links];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    save(updated);
  }

  return (
    <div className="stack compact-stack">
      {/* Saved links list */}
      {links.length > 0 ? (
        <div className="stack compact-stack">
          {links.map((link, i) => (
            <div
              key={i}
              className="inset-card"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{link.label}</div>
                <div
                  className="muted"
                  style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {link.url}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                >
                  Open
                </a>
                <button
                  className="button secondary"
                  style={{ padding: "4px 8px", fontSize: 12 }}
                  onClick={() => moveUp(i)}
                  disabled={i === 0 || saving}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="button secondary"
                  style={{ padding: "4px 8px", fontSize: 12 }}
                  onClick={() => moveDown(i)}
                  disabled={i === links.length - 1 || saving}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  className="button secondary"
                  style={{ padding: "4px 10px", fontSize: 12, color: "#f87171" }}
                  onClick={() => removeLink(i)}
                  disabled={saving}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>No links saved yet. Add one below.</p>
      )}

      {/* Add new link form */}
      <div className="inset-card stack compact-stack">
        <strong style={{ fontSize: 13 }}>Add a link</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ flex: "0 0 auto" }}>
            <span style={{ fontSize: 12, color: "#8b8b95", display: "block", marginBottom: 4 }}>Type</span>
            <select
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{ minWidth: 130 }}
            >
              {PRESETS.map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </label>

          {newLabel === "Other" && (
            <label style={{ flex: "1 1 120px" }}>
              <span style={{ fontSize: 12, color: "#8b8b95", display: "block", marginBottom: 4 }}>Label</span>
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="My link label"
              />
            </label>
          )}

          <label style={{ flex: "1 1 260px" }}>
            <span style={{ fontSize: 12, color: "#8b8b95", display: "block", marginBottom: 4 }}>URL</span>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder={urlPlaceholder}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
          </label>

          <button
            className="button"
            onClick={addLink}
            disabled={saving || !newUrl.trim() || (newLabel === "Other" && !customLabel.trim())}
            style={{ flexShrink: 0 }}
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      {error && <p className="muted" style={{ margin: 0, color: "#f87171" }}>{error}</p>}
      {message && <p className="muted" style={{ margin: 0, color: "#4ade80" }}>{message}</p>}
    </div>
  );
}
