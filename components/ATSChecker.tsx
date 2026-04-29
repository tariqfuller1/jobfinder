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

function downloadPDF(resumeText: string, jobTitle: string, company: string) {
  const escaped = resumeText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${jobTitle} — ${company} Resume</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; padding: 0.75in; }
    pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
    @media print { body { padding: 0.5in; } @page { margin: 0.5in; } }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;
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
