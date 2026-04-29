"use client";

import { useMemo, useState, useTransition } from "react";
import { regenerateWithSuggestion } from "@/app/actions/ai-rewrite";
import { generateCoverLetterAI } from "@/app/actions/generate-cover-letter";
import type { WorkExperienceEntry } from "@/lib/profile";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// "Label: URL" → label word becomes the blue hyperlink; bare URL → URL is the link text
function linkifyEsc(text: string): string {
  const combined = /([\w][\w\s.-]*?):\s*(https?:\/\/[^\s|<>]+)|(https?:\/\/[^\s|<>]+)/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = combined.exec(text)) !== null) {
    result += esc(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      const label = match[1].trim();
      const url = match[2].replace(/[.,;)]+$/, "");
      result += `<a href="${esc(url)}" style="color:#1a56db;text-decoration:underline;">${esc(label)}</a>`;
    } else {
      const url = match[3].replace(/[.,;)]+$/, "");
      result += `<a href="${esc(url)}" style="color:#1a56db;text-decoration:underline;">${esc(url)}</a>`;
    }
    lastIndex = match.index + match[0].length;
  }
  result += esc(text.slice(lastIndex));
  return result;
}

function buildCoverLetterHTML(text: string, jobTitle: string, company: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const body = paragraphs.map((p) => {
    // Signature block lines (Sincerely / name / contact)
    if (paragraphs.indexOf(p) === paragraphs.length - 1) {
      const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
      return `<p class="sig">${lines.map(linkifyEsc).join("<br>")}</p>`;
    }
    // Single-line paragraphs that are the greeting or closing word
    const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1) {
      return `<p>${linkifyEsc(lines[0])}</p>`;
    }
    return lines.map((l) => `<p>${linkifyEsc(l)}</p>`).join("\n");
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cover Letter — ${esc(jobTitle)} at ${esc(company)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #000;
      padding: 0.9in 1in;
      max-width: 8.5in;
      margin: 0 auto;
    }
    p { margin-bottom: 14px; }
    p.sig { margin-top: 24px; margin-bottom: 0; white-space: pre-line; }
    @media print {
      html, body { padding: 0; margin: 0; }
      @page { size: letter; margin: 0.85in 1in; }
    }
  </style>
</head>
<body>
${body}
<script>window.onload = function() { setTimeout(function() { window.print(); }, 150); }<\/script>
</body>
</html>`;
}

function downloadPDF(text: string, jobTitle: string, company: string) {
  const html = buildCoverLetterHTML(text, jobTitle, company);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function CoverLetterEditor({
  initialValue,
  fileName,
  type = "cover-letter",
  jobTitle = "",
  jobCompany = "",
  jobDescriptionText = "",
  name = "",
  email = "",
  phone = "",
  summary = "",
  skills = [],
  stacks = [],
  workExperience = [],
  educationEntries = [],
  profileLinks = [],
}: {
  initialValue: string;
  fileName: string;
  type?: "cover-letter" | "resume";
  jobTitle?: string;
  jobCompany?: string;
  jobDescriptionText?: string;
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills?: string[];
  stacks?: string[];
  workExperience?: WorkExperienceEntry[];
  educationEntries?: string[];
  profileLinks?: { label: string; url: string }[];
}) {
  const [value, setValue] = useState(initialValue);
  const [copied, setCopied] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [aiError, setAiError] = useState("");
  const [isGenerating, startGenerate] = useTransition();
  const [isPending, startTransition] = useTransition();

  const wordCount = useMemo(() => {
    return value.trim() ? value.trim().split(/\s+/).length : 0;
  }, [value]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleGenerate = () => {
    setAiError("");
    startGenerate(async () => {
      const result = await generateCoverLetterAI(
        jobTitle, jobCompany, jobDescriptionText,
        name, email, phone, summary,
        skills, stacks, workExperience, educationEntries, profileLinks,
      );
      if (result.ok) {
        setValue(result.letter);
      } else {
        setAiError(result.error);
      }
    });
  };

  const handleRegenerate = () => {
    if (!suggestion.trim() || isPending) return;
    setAiError("");
    startTransition(async () => {
      const result = await regenerateWithSuggestion(
        type, value, suggestion, jobTitle, jobCompany, jobDescriptionText,
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

      {/* AI generate full letter */}
      <div className="inset-card" style={{ padding: "12px 14px", display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
              <span style={{ opacity: 0.7 }}>✦</span> Generate full letter with AI
            </div>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
              Groq rewrites the letter from scratch using your profile and this job's description.
            </p>
          </div>
          <button
            type="button"
            className="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ fontSize: 13, whiteSpace: "nowrap" }}
          >
            {isGenerating ? "Generating…" : "Generate with AI"}
          </button>
        </div>
        {aiError && !isPending && (
          <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{aiError}</p>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={22}
        className="letter-textarea"
        style={isGenerating || isPending ? { opacity: 0.55 } : {}}
        disabled={isGenerating || isPending}
      />

      <div className="actions">
        <button type="button" className="button" onClick={() => downloadPDF(value, jobTitle, jobCompany)}>
          Download PDF
        </button>
        <button type="button" className="button secondary" onClick={copyToClipboard}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="button secondary" onClick={() => setValue(initialValue)}>
          Reset
        </button>
      </div>

      {/* AI refinement */}
      <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
          <span style={{ opacity: 0.7 }}>✦</span> Refine with AI
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Describe what to change and the letter will be rewritten based on your note.
        </p>
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="e.g. Make the tone more formal, add emphasis on my React experience, shorten the second paragraph…"
          rows={3}
          style={{ resize: "vertical", fontSize: 13 }}
          disabled={isPending || isGenerating}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRegenerate();
          }}
        />
        {aiError && isPending && (
          <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>Error: {aiError}</p>
        )}
        <button
          type="button"
          className="button secondary"
          onClick={handleRegenerate}
          disabled={!suggestion.trim() || isPending || isGenerating}
          style={{ justifyContent: "center" }}
        >
          {isPending ? "Refining…" : "Refine with AI"}
        </button>
      </div>
    </div>
  );
}
