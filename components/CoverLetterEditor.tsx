"use client";

import { useMemo, useState, useTransition } from "react";
import { regenerateWithSuggestion } from "@/app/actions/ai-rewrite";
import { generateCoverLetterAI } from "@/app/actions/generate-cover-letter";
import type { WorkExperienceEntry } from "@/lib/profile";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

const COVER_LETTER_TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean Arial, standard business margins",
    css: `
      body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.65; color: #000; padding: 0.9in 1in; max-width: 8.5in; margin: 0 auto; }
      p { margin-bottom: 14px; }
      p.sig { margin-top: 28px; margin-bottom: 0; white-space: pre-line; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.85in 1in; } }
    `,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Calibri, navy greeting line, contemporary feel",
    css: `
      body { font-family: Calibri, Arial, sans-serif; font-size: 11.5pt; line-height: 1.7; color: #1a1a1a; padding: 0.9in 1in; max-width: 8.5in; margin: 0 auto; }
      p { margin-bottom: 16px; }
      p.greeting { color: #1e3a5f; font-weight: 600; margin-bottom: 18px; }
      p.sig { margin-top: 32px; margin-bottom: 0; white-space: pre-line; color: #1e3a5f; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.85in 1in; } }
    `,
  },
  {
    id: "formal",
    name: "Formal",
    description: "Georgia serif, justified body, traditional look",
    css: `
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.75; color: #000; padding: 1in 1.1in; max-width: 8.5in; margin: 0 auto; }
      p { margin-bottom: 16px; text-align: justify; }
      p.greeting { text-align: left; }
      p.sig { margin-top: 32px; margin-bottom: 0; white-space: pre-line; text-align: left; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.9in 1.1in; } }
    `,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Helvetica, extra spacing, airy and modern",
    css: `
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.85; color: #2d2d2d; padding: 1in 1.15in; max-width: 8.5in; margin: 0 auto; }
      p { margin-bottom: 20px; }
      p.greeting { letter-spacing: 0.01em; }
      p.sig { margin-top: 40px; margin-bottom: 0; white-space: pre-line; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.9in 1.1in; } }
    `,
  },
] as const;

type TemplateId = typeof COVER_LETTER_TEMPLATES[number]["id"];

function buildCoverLetterHTML(text: string, jobTitle: string, company: string, templateId: TemplateId = "classic", forPrint = true): string {
  const template = COVER_LETTER_TEMPLATES.find((t) => t.id === templateId) ?? COVER_LETTER_TEMPLATES[0];
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const body = paragraphs.map((p, i) => {
    const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
    // Last paragraph = signature block
    if (i === paragraphs.length - 1) {
      return `<p class="sig">${lines.map(linkifyEsc).join("<br>")}</p>`;
    }
    // First paragraph = greeting line
    if (i === 0) {
      return `<p class="greeting">${linkifyEsc(lines.join(" "))}</p>`;
    }
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
    a { color: #1a56db; text-decoration: underline; }
    ${template.css}
  </style>
</head>
<body>
${body}
${forPrint ? `<script>window.onload = function() { setTimeout(function() { window.print(); }, 150); }<\/script>` : ""}
</body>
</html>`;
}

function downloadPDF(text: string, jobTitle: string, company: string, templateId: TemplateId) {
  const html = buildCoverLetterHTML(text, jobTitle, company, templateId, true);
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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("classic");
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, startGenerate] = useTransition();
  const [isPending, startTransition] = useTransition();

  const wordCount = useMemo(() => value.trim() ? value.trim().split(/\s+/).length : 0, [value]);

  const previewHtml = useMemo(
    () => value ? buildCoverLetterHTML(value, jobTitle, jobCompany, selectedTemplate, false) : "",
    [value, jobTitle, jobCompany, selectedTemplate],
  );

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

      {/* Template picker */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Letter format</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COVER_LETTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: selectedTemplate === t.id ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                background: selectedTemplate === t.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: selectedTemplate === t.id ? "#a5b4fc" : "#d4d4d8" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="actions">
        <button type="button" className="button" onClick={() => downloadPDF(value, jobTitle, jobCompany, selectedTemplate)}>
          Download PDF
        </button>
        <button type="button" className="button secondary" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        <button type="button" className="button secondary" onClick={copyToClipboard}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="button secondary" onClick={() => setValue(initialValue)}>
          Reset
        </button>
      </div>

      {showPreview && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Live preview — reflects the selected format and any edits above.
          </div>
          <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "#fff" }}>
            <iframe
              srcDoc={previewHtml}
              title="Cover letter preview"
              style={{ width: "100%", height: 900, border: "none", display: "block" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

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
