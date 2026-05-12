"use client";

import { useState, useTransition } from "react";
import { generateOutreachMessage, refineOutreachMessage, type MessageType } from "@/app/actions/generate-outreach";
import type { WorkExperienceEntry } from "@/lib/profile";

const MESSAGE_TYPES: { id: MessageType; label: string; description: string }[] = [
  { id: "linkedin",      label: "LinkedIn DM",       description: "Short · ~300 chars" },
  { id: "cold-email",    label: "Cold email",         description: "Full email + subject" },
  { id: "informational", label: "Informational ask",  description: "Request a 15-min call" },
  { id: "follow-up",     label: "Follow-up",          description: "After no response" },
];

export function OutreachEditor({
  companyName,
  companyNotes,
  companyFocus,
  relatedRoles,
  initialMessage,
  name,
  summary,
  skills,
  stacks,
  workExperience,
}: {
  companyName: string;
  companyNotes: string;
  companyFocus: string[];
  relatedRoles: string[];
  initialMessage: string;
  name: string;
  summary: string;
  skills: string[];
  stacks: string[];
  workExperience: WorkExperienceEntry[];
}) {
  const [value, setValue] = useState(initialMessage);
  const [messageType, setMessageType] = useState<MessageType>("linkedin");
  const [recipientRole, setRecipientRole] = useState("");
  const [selectedRole, setSelectedRole] = useState(relatedRoles[0] ?? "");
  const [suggestion, setSuggestion] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isGenerating, startGenerate] = useTransition();
  const [isRefining, startRefine] = useTransition();

  const charCount = value.length;
  const isLinkedIn = messageType === "linkedin";

  const handleGenerate = () => {
    setError("");
    startGenerate(async () => {
      const res = await generateOutreachMessage(
        messageType, companyName, companyNotes, companyFocus,
        selectedRole, recipientRole, name, summary, skills, stacks, workExperience,
      );
      if (res.ok) setValue(res.message);
      else setError(res.error);
    });
  };

  const handleRefine = () => {
    if (!suggestion.trim() || isRefining) return;
    setError("");
    startRefine(async () => {
      const res = await refineOutreachMessage(value, suggestion, messageType, companyName);
      if (res.ok) { setValue(res.message); setSuggestion(""); }
      else setError(res.error);
    });
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS iframe) — fall back to selection
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>

      {/* ── Message type + Generate (same row) ── */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {MESSAGE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMessageType(t.id)}
              title={t.description}
              style={{
                padding: "7px 13px",
                borderRadius: 8,
                border: messageType === t.id ? "1px solid rgba(99,102,241,0.6)" : "1px solid rgba(255,255,255,0.1)",
                background: messageType === t.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: messageType === t.id ? "#a5b4fc" : "#d4d4d8",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button"
          onClick={handleGenerate}
          disabled={isGenerating || isRefining}
          style={{ fontSize: 13, whiteSpace: "nowrap", minHeight: 38 }}
        >
          {isGenerating ? "Generating…" : "✦ Generate"}
        </button>
      </div>

      {/* ── Context inputs ── */}
      <div style={{ display: "grid", gridTemplateColumns: relatedRoles.length > 0 ? "1fr 1fr" : "1fr", gap: 8 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Who are you messaging?
          </label>
          <input
            value={recipientRole}
            onChange={(e) => setRecipientRole(e.target.value)}
            placeholder="Hiring Manager, Lead Engineer, Recruiter…"
            style={{ fontSize: 13 }}
            disabled={isGenerating || isRefining}
          />
        </div>
        {relatedRoles.length > 0 && (
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Role to reference
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ fontSize: 13 }}
              disabled={isGenerating || isRefining}
            >
              <option value="">— None —</option>
              {relatedRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Message textarea ── */}
      <div style={{ display: "grid", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Edit freely — the AI draft is a starting point</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            color: isLinkedIn && charCount > 300 ? "#f87171" : "#6b7280",
          }}>
            {charCount}{isLinkedIn ? " / 300" : " chars"}
          </span>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={isLinkedIn ? 7 : 14}
          style={{
            width: "100%",
            resize: "vertical",
            fontSize: 13,
            lineHeight: 1.65,
            opacity: isGenerating || isRefining ? 0.55 : 1,
          }}
          disabled={isGenerating || isRefining}
        />
      </div>

      {/* ── Copy + Reset ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="button" onClick={copyMessage} style={{ fontSize: 13 }}>
          {copied ? "Copied!" : "Copy message"}
        </button>
        <button type="button" className="button secondary" onClick={() => setValue(initialMessage)} style={{ fontSize: 13 }}>
          Reset
        </button>
      </div>

      {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}

      {/* ── Refine with AI ── */}
      <div style={{ display: "grid", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#d4d4d8" }}>✦ Refine with AI</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>— describe what to change</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Make it shorter, mention my Unity experience, remove last sentence…"
            rows={2}
            style={{ resize: "vertical", fontSize: 13, flex: 1 }}
            disabled={isGenerating || isRefining}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRefine(); }}
          />
          <button
            type="button"
            className="button secondary"
            onClick={handleRefine}
            disabled={!suggestion.trim() || isRefining || isGenerating}
            style={{ fontSize: 13, alignSelf: "flex-end", whiteSpace: "nowrap" }}
          >
            {isRefining ? "Refining…" : "Refine"}
          </button>
        </div>
      </div>
    </div>
  );
}
