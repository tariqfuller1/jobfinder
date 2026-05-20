"use client";

import { useState, useMemo, useTransition } from "react";
import { runATSCheck, type ATSCheckResult, type QualityRating } from "@/app/actions/ats-check";
import { autoImproveResume } from "@/app/actions/auto-improve-resume";
import { regenerateWithSuggestion } from "@/app/actions/ai-rewrite";
import type { WorkExperienceEntry, ProjectEntry, ProfileLink } from "@/lib/profile";

function QualityBadge({ rating }: { rating: QualityRating }) {
  const config = {
    Excellent: { color: "#4ade80", bg: "rgba(74,222,128,0.12)", label: "Excellent fit" },
    Good:      { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "Good fit" },
    Fair:      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "Fair fit" },
    Poor:      { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Poor fit" },
  }[rating];
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 700,
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.color}40`,
    }}>
      {config.label}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#fbbf24" : "#f87171";
  const label = score >= 75 ? "Strong match" : score >= 50 ? "Partial match" : "Needs work";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 100, height: 100, borderRadius: "50%",
        border: `6px solid ${color}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(circle, rgba(0,0,0,0.4), rgba(0,0,0,0.7))`,
      }}>
        <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>/ 100</span>
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Escape text and linkify:
// "Label: URL"  → the label word becomes the blue hyperlink (URL hidden)
// bare URL      → the URL itself becomes the blue hyperlink
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

function isSectionHead(line: string) {
  return /^[A-Z][A-Z\s&/,()-]{2,}$/.test(line) && !line.includes("|");
}

function renderBodyLine(line: string): string {
  if (line.startsWith("•") || line.startsWith("·")) {
    const text = line.replace(/^[•·]\s*/, "");
    return `<p class="bullet">&#8226; ${linkifyEsc(text)}</p>`;
  }
  if (line.includes(" | ")) {
    return `<p class="entry">${linkifyEsc(line)}</p>`;
  }
  return `<p class="body-text">${linkifyEsc(line)}</p>`;
}

const RESUME_TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Centered name, all-caps sections, clean Arial",
    css: `
      body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #000; padding: 0.7in 0.85in; max-width: 8.5in; margin: 0 auto; }
      .name { font-size: 20pt; font-weight: 700; text-align: center; margin-bottom: 4px; }
      .contact { font-size: 9.5pt; text-align: center; margin-bottom: 6px; }
      .name-rule { border: none; border-top: 1.5px solid #000; margin: 5px 0 9px; }
      .section-head { font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #555; padding-bottom: 1px; margin: 12px 0 4px; }
      .entry { font-weight: 700; font-size: 10.5pt; margin: 6px 0 1px; }
      .bullet { font-size: 10pt; margin: 1px 0; padding-left: 1.1em; text-indent: -1.1em; }
      .body-text { font-size: 10.5pt; margin: 2px 0; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.65in 0.85in; } }
    `,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Left-aligned, navy blue accents, Calibri",
    css: `
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; padding: 0.7in 0.9in; max-width: 8.5in; margin: 0 auto; }
      .name { font-size: 22pt; font-weight: 700; text-align: left; color: #1e3a5f; margin-bottom: 3px; }
      .contact { font-size: 9.5pt; text-align: left; color: #444; margin-bottom: 6px; }
      .name-rule { border: none; border-top: 2px solid #1e3a5f; margin: 4px 0 10px; }
      .section-head { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1e3a5f; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 2px; margin: 14px 0 5px; }
      .entry { font-weight: 700; font-size: 10.5pt; margin: 6px 0 1px; }
      .bullet { font-size: 10pt; margin: 2px 0; padding-left: 1.1em; text-indent: -1.1em; }
      .body-text { font-size: 11pt; margin: 2px 0; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.65in 0.9in; } }
    `,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter spacing — fits more on one page",
    css: `
      body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.35; color: #000; padding: 0.5in 0.7in; max-width: 8.5in; margin: 0 auto; }
      .name { font-size: 16pt; font-weight: 700; text-align: center; margin-bottom: 2px; }
      .contact { font-size: 9pt; text-align: center; margin-bottom: 4px; }
      .name-rule { border: none; border-top: 1px solid #000; margin: 3px 0 6px; }
      .section-head { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #777; padding-bottom: 1px; margin: 8px 0 2px; }
      .entry { font-weight: 700; font-size: 10pt; margin: 4px 0 0; }
      .bullet { font-size: 9.5pt; margin: 0; padding-left: 1em; text-indent: -1em; }
      .body-text { font-size: 10pt; margin: 1px 0; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.45in 0.7in; } }
    `,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Serif font, letter-spaced name, formal look",
    css: `
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.55; color: #000; padding: 0.8in 1in; max-width: 8.5in; margin: 0 auto; }
      .name { font-size: 22pt; font-weight: 400; text-align: center; letter-spacing: 0.08em; margin-bottom: 4px; }
      .contact { font-size: 9.5pt; text-align: center; font-style: italic; margin-bottom: 8px; }
      .name-rule { border: none; border-top: 0.5px solid #000; margin: 5px 0 10px; }
      .section-head { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 14px 0 5px; }
      .entry { font-weight: 700; font-size: 11pt; margin: 7px 0 1px; }
      .bullet { font-size: 10.5pt; margin: 2px 0; padding-left: 1.1em; text-indent: -1.1em; }
      .body-text { font-size: 11pt; margin: 3px 0; }
      @media print { html, body { padding: 0; margin: 0; } @page { size: letter; margin: 0.75in 1in; } }
    `,
  },
] as const;

type TemplateId = typeof RESUME_TEMPLATES[number]["id"];

function buildResumeHTML(text: string, jobTitle: string, company: string, templateId: TemplateId = "classic", forPrint = true): string {
  const template = RESUME_TEMPLATES.find((t) => t.id === templateId) ?? RESUME_TEMPLATES[0];
  const lines = text.split("\n").map((l) => l.trimEnd());
  let body = "";
  let i = 0;

  while (i < lines.length && !lines[i].trim()) i++;

  if (i < lines.length) {
    body += `<h1 class="name">${esc(lines[i].trim())}</h1>`;
    i++;
  }

  while (i < lines.length && !lines[i].trim()) i++;

  if (i < lines.length && !isSectionHead(lines[i].trim()) && !lines[i].trim().startsWith("•")) {
    body += `<p class="contact">${linkifyEsc(lines[i].trim())}</p>`;
    body += `<hr class="name-rule">`;
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;
    if (!line) continue;
    if (isSectionHead(line)) {
      body += `<p class="section-head">${esc(line)}</p>`;
    } else {
      body += renderBodyLine(line);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(jobTitle)} — ${esc(company)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ${template.css}
    a { color: #1a56db; text-decoration: underline; }
  </style>
</head>
<body>
${body}
${forPrint ? `<script>window.onload = function() { setTimeout(function() { window.print(); }, 150); }<\/script>` : ""}
</body>
</html>`;
}

function downloadPDF(resumeText: string, jobTitle: string, company: string, templateId: TemplateId) {
  const html = buildResumeHTML(resumeText, jobTitle, company, templateId);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function ATSChecker({
  jobTitle,
  jobCompany,
  jobDescriptionText,
  resumeText,
  workExperience,
  projects,
  skills,
  stacks,
  educationEntries,
  name,
  email,
  phone,
  location,
  safeFileName,
  profileLinks,
}: {
  jobTitle: string;
  jobCompany: string;
  jobDescriptionText: string;
  resumeText: string;
  workExperience: WorkExperienceEntry[];
  projects: ProjectEntry[];
  skills: string[];
  stacks: string[];
  educationEntries: string[];
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  safeFileName: string;
  profileLinks: ProfileLink[];
}) {
  const [result, setResult] = useState<Extract<ATSCheckResult, { ok: true }> | null>(null);
  const [editedResume, setEditedResume] = useState("");
  const [qualityRating, setQualityRating] = useState<QualityRating | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState("");
  const [improveAttempts, setImproveAttempts] = useState(0);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("classic");
  const [showPreview, setShowPreview] = useState(false);
  const [isChecking, startCheck] = useTransition();
  const [isRefining, startRefine] = useTransition();

  const previewHtml = useMemo(
    () => editedResume ? buildResumeHTML(editedResume, jobTitle, jobCompany, selectedTemplate, false) : "",
    [editedResume, jobTitle, jobCompany, selectedTemplate],
  );
  const resumeLinks = profileLinks.filter((l) => l.includeInResume !== false);

  const hasData = resumeText.trim().length > 0 || workExperience.length > 0 || projects.length > 0;

  function handleCheck() {
    setError("");
    setImproveAttempts(0);
    startCheck(async () => {
      const res = await runATSCheck(jobTitle, jobCompany, jobDescriptionText, workExperience, projects, skills, stacks, educationEntries, name, resumeText, resumeLinks, email, phone, location);
      if (!res.ok) { setError(res.error); return; }

      setResult(res);
      setEditedResume(res.optimizedResume);

      // Automatically improve if quality isn't Good or Excellent
      if (res.qualityRating === "Fair" || res.qualityRating === "Poor") {
        const improved = await autoImproveResume(
          res.optimizedResume,
          res.qualityRating,
          res.qualityFeedback,
          jobTitle,
          jobCompany,
          jobDescriptionText,
          resumeLinks,
        );
        if (improved.ok) {
          setEditedResume(improved.optimizedResume);
          setQualityRating(improved.qualityRating);
          setQualityFeedback(improved.qualityFeedback);
          setImproveAttempts(improved.attempts);
          return;
        }
      }

      setQualityRating(res.qualityRating);
      setQualityFeedback(res.qualityFeedback);
    });
  }

  function handleRefine() {
    if (!suggestion.trim() || isRefining) return;
    setAiError("");
    startRefine(async () => {
      const res = await regenerateWithSuggestion("resume", editedResume, suggestion, jobTitle, jobCompany, jobDescriptionText);
      if (res.ok) {
        setEditedResume(res.draft);
        setSuggestion("");
      } else {
        setAiError(res.error);
      }
    });
  }

  if (!hasData) {
    return (
      <div className="inset-card" style={{ padding: "20px", display: "grid", gap: 10, textAlign: "center" }}>
        <div style={{ fontSize: 28 }}>📄</div>
        <strong style={{ fontSize: 15 }}>No resume data on your profile</strong>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Upload your resume or add work experience on the profile page so the ATS checker has something to work with.
        </p>
        <a className="button" href="/profile" style={{ justifyContent: "center" }}>Go to profile</a>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!result && (
        <div className="card" style={{ padding: "20px", display: "grid", gap: 12, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#a1a1aa" }}>
            Groq AI scores your resume against the job description, rewrites it with missing keywords, and automatically improves it until it reaches Good or Excellent quality.
          </div>
          {resumeLinks.length > 0 && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Links included: {resumeLinks.map((l) => l.label).join(", ")} — <a href="/profile" style={{ color: "#9ca3af", textDecoration: "underline" }}>manage in profile</a>
            </div>
          )}
          {error && <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>}
          <button
            className="button"
            onClick={handleCheck}
            disabled={isChecking}
            style={{ justifyContent: "center", fontSize: 14 }}
          >
            {isChecking ? "Analyzing & improving resume…" : "Run ATS Check"}
          </button>
        </div>
      )}

      {result && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Score + quality + keywords */}
          <div className="grid-2" style={{ gap: 14, alignItems: "start" }}>
            <div className="card" style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <ScoreRing score={result.score} />
                <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 140 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>ATS Score</span>
                    {qualityRating && <QualityBadge rating={qualityRating} />}
                    {improveAttempts > 0 && (
                      <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                        ({improveAttempts} improvement{improveAttempts !== 1 ? "s" : ""} applied)
                      </span>
                    )}
                  </div>
                  {qualityFeedback && (
                    <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                      {qualityFeedback}
                    </p>
                  )}
                  <button
                    className="button secondary"
                    onClick={handleCheck}
                    disabled={isChecking}
                    style={{ fontSize: 12, marginTop: 2 }}
                  >
                    {isChecking ? "Re-analyzing…" : "Re-run check"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {result.matchedKeywords.length > 0 && (
                <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>✓ Matched keywords</div>
                  <div className="badges">
                    {result.matchedKeywords.map((kw) => (
                      <span key={kw} className="badge" style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80" }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.missingKeywords.length > 0 && (
                <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f87171" }}>✗ Missing keywords (added to resume)</div>
                  <div className="badges">
                    {result.missingKeywords.map((kw) => (
                      <span key={kw} className="badge" style={{ borderColor: "rgba(248,113,113,0.3)", color: "#f87171" }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quality gate — shown only when loop couldn't reach Good/Excellent */}
          {(qualityRating === "Fair" || qualityRating === "Poor") && !isChecking && (
            <div className="inset-card" style={{ padding: "14px 16px", borderColor: "rgba(251,191,36,0.3)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>
                Resume rated {qualityRating} after {improveAttempts > 0 ? `${improveAttempts} auto-improvements` : "analysis"}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Your profile may not have enough experience to fully match this role. Try adding more relevant work history on your
                profile, use the refinement box below to strengthen specific areas, then re-run the check.
              </p>
              {aiError && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{aiError}</p>}
            </div>
          )}

          {/* Optimized resume */}
          <div className="card" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div className="space-between">
              <h2 className="section-title">ATS-optimized resume</h2>
              <span className="badge">{editedResume.trim().split(/\s+/).length} words</span>
            </div>

            <textarea
              value={editedResume}
              onChange={(e) => setEditedResume(e.target.value)}
              rows={24}
              className="letter-textarea"
              style={isRefining ? { opacity: 0.55 } : {}}
              disabled={isRefining}
            />

            {/* Template picker */}
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Resume format</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {RESUME_TEMPLATES.map((t) => (
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
              <button
                className="button"
                onClick={() => downloadPDF(editedResume, jobTitle, jobCompany, selectedTemplate)}
              >
                Download PDF
              </button>
              <button
                className="button secondary"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Hide preview" : "Preview"}
              </button>
              <button
                className="button secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(editedResume);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                className="button secondary"
                onClick={() => setEditedResume(result.optimizedResume)}
              >
                Reset
              </button>
            </div>

            {showPreview && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  Live preview — reflects the current template and any edits you make above.
                </div>
                <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "#fff" }}>
                  <iframe
                    srcDoc={previewHtml}
                    title="Resume preview"
                    style={{ width: "100%", height: 900, border: "none", display: "block" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}

            {/* AI refinement box */}
            <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
                <span style={{ opacity: 0.7 }}>✦</span> Refine with AI
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Describe any further changes and the resume will be rewritten based on your note.
              </p>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="e.g. Lead with my most recent role, make the summary more concise, remove the objective line…"
                rows={3}
                style={{ resize: "vertical", fontSize: 13 }}
                disabled={isRefining}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRefine(); }}
              />
              {aiError && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>Error: {aiError}</p>}
              <button
                className="button"
                onClick={handleRefine}
                disabled={!suggestion.trim() || isRefining}
                style={{ justifyContent: "center" }}
              >
                {isRefining ? "Refining…" : "Refine with AI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
