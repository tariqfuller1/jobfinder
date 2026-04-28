"use client";

import { useMemo, useState, useTransition } from "react";
import { regenerateWithSuggestion } from "@/app/actions/ai-rewrite";

export function CoverLetterEditor({
  initialValue,
  fileName,
  type = "cover-letter",
  jobTitle = "",
  jobCompany = "",
  jobDescriptionText = "",
}: {
  initialValue: string;
  fileName: string;
  type?: "cover-letter" | "resume";
  jobTitle?: string;
  jobCompany?: string;
  jobDescriptionText?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [copied, setCopied] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [aiError, setAiError] = useState("");
  const [isPending, startTransition] = useTransition();

  const wordCount = useMemo(() => {
    return value.trim() ? value.trim().split(/\s+/).length : 0;
  }, [value]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadTextFile = () => {
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    if (!suggestion.trim() || isPending) return;
    setAiError("");
    startTransition(async () => {
      const result = await regenerateWithSuggestion(
        type,
        value,
        suggestion,
        jobTitle,
        jobCompany,
        jobDescriptionText,
      );
      if (result.ok) {
        setValue(result.draft);
        setSuggestion("");
      } else {
        setAiError(result.error);
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="space-between">
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Edit the draft before sending. Aim for one page and keep the strongest details near the top.
        </p>
        <span className="badge">{wordCount} words</span>
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={22}
        className="letter-textarea"
        style={isPending ? { opacity: 0.55 } : {}}
        disabled={isPending}
      />

      <div className="actions">
        <button type="button" className="button" onClick={copyToClipboard}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="button secondary" onClick={downloadTextFile}>
          Download .txt
        </button>
        <button type="button" className="button secondary" onClick={() => setValue(initialValue)}>
          Reset
        </button>
      </div>

      <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
          <span style={{ opacity: 0.7 }}>✦</span> AI suggestions
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Describe what to change and the {type === "cover-letter" ? "letter" : "resume"} will be rewritten based on your note.
        </p>
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder={
            type === "cover-letter"
              ? "e.g. Make the tone more formal, add emphasis on my React experience, shorten the second paragraph…"
              : "e.g. Lead with my most recent role, remove the education section, add more technical keywords…"
          }
          rows={3}
          style={{ resize: "vertical", fontSize: 13 }}
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRegenerate();
          }}
        />
        {aiError && (
          <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>Error: {aiError}</p>
        )}
        <button
          type="button"
          className="button"
          onClick={handleRegenerate}
          disabled={!suggestion.trim() || isPending}
          style={{ justifyContent: "center" }}
        >
          {isPending ? "Regenerating…" : "Regenerate with AI"}
        </button>
      </div>
    </div>
  );
}
