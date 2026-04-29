"use client";

import { useState, useTransition } from "react";
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

function buildResumeHTML(text: string, jobTitle: string, company: string): string {
  const lines = text.split("\n").map((l) => l.trimEnd());
  let body = "";
  let i = 0;

  while (i < lines.length && !lines[i].trim()) i++;

  // Name — first non-blank line
  if (i < lines.length) {
    body += `<h1 class="name">${esc(lines[i].trim())}</h1>`;
    i++;
  }

  while (i < lines.length && !lines[i].trim()) i++;

  // Contact line — second non-blank line if not a section header
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
    /* ATS-safe: single column, no flexbox, no tables, no columns, linear DOM order */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #000;
      padding: 0.7in 0.85in;
      max-width: 8.5in;
      margin: 0 auto;
    }
    .name {
      font-size: 20pt;
      font-weight: 700;
      text-align: center;
      margin-bottom: 4px;
    }
    .contact {
      font-size: 9.5pt;
      text-align: center;
      margin-bottom: 6px;
    }
    .name-rule {
      border: none;
      border-top: 1.5px solid #000;
      margin: 5px 0 9px;
    }
    .section-head {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #555;
      padding-bottom: 1px;
      margin: 12px 0 4px;
    }
    /* Entry: company | title | location | dates — all inline, no positioning tricks */
    .entry {
      font-weight: 700;
      font-size: 10.5pt;
      margin: 6px 0 1px;
    }
    /* Bullet: text-indent hanging indent — no flex, guaranteed linear parse */
    .bullet {
      font-size: 10pt;
      margin: 1px 0;
      padding-left: 1.1em;
      text-indent: -1.1em;
    }
    .body-text {
      font-size: 10.5pt;
      margin: 2px 0;
    }
    @media print {
      html, body { padding: 0; margin: 0; }
      @page { size: letter; margin: 0.65in 0.85in; }
    }
  </style>
</head>
<body>
${body}
<script>window.onload = function() { setTimeout(function() { window.print(); }, 150); }<\/script>
</body>
</html>`;
}

function downloadPDF(resumeText: string, jobTitle: string, company: string) {
  const html = buildResumeHTML(resumeText, jobTitle, company);
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
  const [isChecking, startCheck] = useTransition();
  const [isRefining, startRefine] = useTransition();
  const resumeLinks = profileLinks.filter((l) => l.includeInResume !== false);

  const hasData = resumeText.trim().length > 0 || workExperience.length > 0 || projects.length > 0;

  function handleCheck() {
    setError("");
    setImproveAttempts(0);
    startCheck(async () => {
      const res = await runATSCheck(jobTitle, jobCompany, jobDescriptionText, workExperience, projects, skills, stacks, educationEntries, name, resumeText, resumeLinks);
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

            <div className="actions">
              <button
                className="button"
                onClick={() => downloadPDF(editedResume, jobTitle, jobCompany)}
              >
                Download PDF
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
