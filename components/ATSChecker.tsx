"use client";

import { useState, useTransition } from "react";
import { runATSCheck, type ATSCheckResult } from "@/app/actions/ats-check";
import { regenerateWithSuggestion } from "@/app/actions/ai-rewrite";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";

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

function isSectionHead(line: string) {
  return /^[A-Z][A-Z\s&/,()-]{2,}$/.test(line) && !line.includes("|");
}

function hasDatePattern(s: string) {
  return /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|\d{4})\b/.test(s);
}

function renderBodyLine(line: string): string {
  if (line.startsWith("•") || line.startsWith("·")) {
    const text = line.replace(/^[•·]\s*/, "");
    return `<div class="bullet"><span class="dot">•</span><span>${esc(text)}</span></div>`;
  }
  if (line.includes(" | ")) {
    const parts = line.split(/\s*\|\s*/);
    const last = parts[parts.length - 1];
    if (parts.length >= 2 && hasDatePattern(last)) {
      const left = parts.slice(0, -1).join(" | ");
      return `<div class="entry"><span class="entry-left">${esc(left)}</span><span class="entry-date">${esc(last)}</span></div>`;
    }
    return `<div class="entry-flat">${parts.map(esc).join('<span class="pipe"> | </span>')}</div>`;
  }
  return `<p class="body-text">${esc(line)}</p>`;
}

function buildResumeHTML(text: string, jobTitle: string, company: string): string {
  const lines = text.split("\n").map((l) => l.trimEnd());
  let body = "";
  let i = 0;

  while (i < lines.length && !lines[i].trim()) i++;

  if (i < lines.length) {
    body += `<h1 class="name">${esc(lines[i].trim())}</h1>`;
    i++;
  }

  while (i < lines.length && !lines[i].trim()) i++;

  if (i < lines.length && !isSectionHead(lines[i].trim()) && !lines[i].startsWith("•")) {
    const parts = lines[i].trim().split(/\s*\|\s*/);
    body += `<div class="contact">${parts.map(esc).join(" &nbsp;|&nbsp; ")}</div>`;
    body += `<hr class="name-rule">`;
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;
    if (!line) continue;
    if (isSectionHead(line)) {
      body += `<div class="section-head">${esc(line)}</div>`;
    } else {
      body += renderBodyLine(line);
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${esc(jobTitle)} — ${esc(company)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      color: #111;
      padding: 0.65in 0.8in;
      max-width: 8.5in;
      margin: 0 auto;
    }
    .name {
      font-size: 20pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.02em;
      margin-bottom: 5px;
    }
    .contact {
      font-size: 9.5pt;
      text-align: center;
      color: #555;
      margin-bottom: 7px;
    }
    .name-rule {
      border: none;
      border-top: 2px solid #111;
      margin: 6px 0 10px;
    }
    .section-head {
      font-size: 10.5pt;
      font-weight: 700;
      letter-spacing: 0.07em;
      border-bottom: 1px solid #666;
      padding-bottom: 2px;
      margin: 13px 0 5px;
    }
    .entry {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: 600;
      font-size: 10.5pt;
      margin: 7px 0 2px;
    }
    .entry-left { flex: 1; margin-right: 8px; }
    .entry-date { font-weight: normal; font-size: 9.5pt; color: #333; white-space: nowrap; }
    .entry-flat { font-weight: 600; font-size: 10.5pt; margin: 7px 0 2px; }
    .pipe { color: #888; font-weight: normal; }
    .bullet {
      display: flex;
      gap: 5px;
      margin: 2px 0;
      padding-left: 10px;
      font-size: 10pt;
    }
    .dot { flex-shrink: 0; }
    .body-text { font-size: 10.5pt; margin: 3px 0; }
    @media print {
      html, body { padding: 0; margin: 0; }
      @page { size: letter; margin: 0.6in 0.75in; }
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
}) {
  const [result, setResult] = useState<Extract<ATSCheckResult, { ok: true }> | null>(null);
  const [editedResume, setEditedResume] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isChecking, startCheck] = useTransition();
  const [isRefining, startRefine] = useTransition();

  const hasData = resumeText.trim().length > 0 || workExperience.length > 0 || projects.length > 0;

  function handleCheck() {
    setError("");
    startCheck(async () => {
      const res = await runATSCheck(jobTitle, jobCompany, jobDescriptionText, workExperience, projects, skills, stacks, educationEntries, name, resumeText);
      if (res.ok) {
        setResult(res);
        setEditedResume(res.optimizedResume);
      } else {
        setError(res.error);
      }
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
            Groq AI will extract ATS keywords from the job description, score your resume, and rewrite it with the missing terms integrated.
          </div>
          {error && <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>}
          <button
            className="button"
            onClick={handleCheck}
            disabled={isChecking}
            style={{ justifyContent: "center", fontSize: 14 }}
          >
            {isChecking ? "Analyzing resume…" : "Run ATS Check"}
          </button>
        </div>
      )}

      {result && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Score + keywords */}
          <div className="grid-2" style={{ gap: 14, alignItems: "start" }}>
            <div className="card" style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <ScoreRing score={result.score} />
                <div style={{ display: "grid", gap: 4, flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>ATS Score</div>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                    Based on keyword coverage between your resume and the job description.
                  </p>
                  <button
                    className="button secondary"
                    onClick={handleCheck}
                    disabled={isChecking}
                    style={{ fontSize: 12, marginTop: 4 }}
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
