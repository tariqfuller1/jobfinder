"use client";

import { useState, useTransition } from "react";
import { generateOutreachMessage, refineOutreachMessage, type MessageType } from "@/app/actions/generate-outreach";
import type { WorkExperienceEntry } from "@/lib/profile";

const MESSAGE_TYPES: { id: MessageType; label: string; description: string }[] = [
  { id: "linkedin", label: "LinkedIn DM", description: "Short connection request (~300 chars)" },
  { id: "cold-email", label: "Cold email", description: "Full email with subject line" },
  { id: "informational", label: "Informational ask", description: "Request a 15-min call" },
  { id: "follow-up", label: "Follow-up", description: "After no response" },
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
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>

      {/* Message type picker */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Message type</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MESSAGE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMessageType(t.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: messageType === t.id ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                background: messageType === t.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: messageType === t.id ? "#a5b4fc" : "#d4d4d8" }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Context inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#9ca3af" }}>Who are you messaging? (optional)</label>
          <input
            value={recipientRole}
            onChange={(e) => setRecipientRole(e.target.value)}
            placeholder="e.g. Hiring Manager, Lead Engineer, Recruiter"
            style={{ fontSize: 13 }}
            disabled={isGenerating || isRefining}
          />
        </div>
        {relatedRoles.length > 0 && (
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Role to reference (optional)</label>
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

      {/* Generate button */}
      <div className="inset-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
            <span style={{ opacity: 0.7 }}>✦</span> Generate with AI
          </div>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
            Groq writes a {MESSAGE_TYPES.find(t => t.id === messageType)?.label.toLowerCase()} using your profile and this company's details.
          </p>
        </div>
        <button
          type="button"
          className="button"
          onClick={handleGenerate}
          disabled={isGenerating || isRefining}
          style={{ fontSize: 13, whiteSpace: "nowrap" }}
        >
          {isGenerating ? "Generating…" : "Generate message"}
        </button>
      </div>

      {/* Textarea */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Edit freely — the AI draft is a starting point</span>
          <span className="badge" style={{ color: isLinkedIn && charCount > 300 ? "#f87171" : undefined }}>
            {charCount} chars{isLinkedIn ? " / 300" : ""}
          </span>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={isLinkedIn ? 6 : 14}
          className="letter-textarea"
          style={isGenerating || isRefining ? { opacity: 0.55 } : {}}
          disabled={isGenerating || isRefining}
        />
      </div>

      {/* Actions */}
      <div className="actions">
        <button type="button" className="button" onClick={copyMessage}>
          {copied ? "Copied!" : "Copy message"}
        </button>
        <button type="button" className="button secondary" onClick={() => setValue(initialMessage)}>
          Reset
        </button>
      </div>

      {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}

      {/* AI refine */}
      <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
          <span style={{ opacity: 0.7 }}>✦</span> Refine with AI
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Describe what to change — tone, length, angle, specific detail to add — and the message will be rewritten.
        </p>
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="e.g. Make it shorter and more casual, mention my Unity experience, remove the last sentence…"
          rows={2}
          style={{ resize: "vertical", fontSize: 13 }}
          disabled={isGenerating || isRefining}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRefine(); }}
        />
        <button
          type="button"
          className="button secondary"
          onClick={handleRefine}
          disabled={!suggestion.trim() || isRefining || isGenerating}
          style={{ justifyContent: "center" }}
        >
          {isRefining ? "Refining…" : "Refine with AI"}
        </button>
      </div>
    </div>
  );
}
