"use client";

import { useState, useTransition } from "react";
import { generateAppAnswer, refineAppAnswer } from "@/app/actions/app-question";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";

export function AppQuestionEditor({
  jobTitle,
  jobCompany,
  jobDescriptionText,
  name,
  headline,
  summary,
  skills,
  stacks,
  workExperience,
  projects,
  educationEntries,
  suggestedQuestions = [],
}: {
  jobTitle: string;
  jobCompany: string;
  jobDescriptionText: string;
  name: string;
  headline: string;
  summary: string;
  skills: string[];
  stacks: string[];
  workExperience: WorkExperienceEntry[];
  projects: ProjectEntry[];
  educationEntries: string[];
  suggestedQuestions?: string[];
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [refinement, setRefinement] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, startGenerate] = useTransition();
  const [isRefining, startRefine] = useTransition();

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const busy = isGenerating || isRefining;

  function handleGenerate() {
    if (!question.trim() || busy) return;
    setError("");
    startGenerate(async () => {
      const result = await generateAppAnswer(
        question,
        jobTitle,
        jobCompany,
        jobDescriptionText,
        name,
        headline,
        summary,
        skills,
        stacks,
        workExperience,
        projects,
        educationEntries,
      );
      if (result.ok) {
        setAnswer(result.answer);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRefine() {
    if (!refinement.trim() || !answer.trim() || busy) return;
    setError("");
    startRefine(async () => {
      const result = await refineAppAnswer(
        answer,
        refinement,
        question,
        jobTitle,
        jobCompany,
        jobDescriptionText,
        name,
        headline,
        summary,
        skills,
        stacks,
        workExperience,
        projects,
        educationEntries,
      );
      if (result.ok) {
        setAnswer(result.answer);
        setRefinement("");
      } else {
        setError(result.error);
      }
    });
  }

  async function handleCopy() {
    if (!answer) return;
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* Suggested questions — clickable chips */}
      {suggestedQuestions.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Suggested for this job
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                disabled={busy}
                style={{
                  fontSize: 12,
                  padding: "5px 11px",
                  borderRadius: 6,
                  border: question === q
                    ? "1px solid rgba(99,102,241,0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: question === q
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(255,255,255,0.04)",
                  color: question === q ? "#a5b4fc" : "#9ca3af",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Question input */}
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
          Application question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='Select a suggestion above or type your own question…'
          rows={3}
          style={{ resize: "vertical", fontSize: 13 }}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
        />
        <button
          type="button"
          className="button"
          onClick={handleGenerate}
          disabled={!question.trim() || busy}
          style={{ justifyContent: "center" }}
        >
          {isGenerating ? "Generating…" : "✦ Generate answer"}
        </button>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>
      )}

      {/* Answer */}
      {(answer || isGenerating) && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>Your answer</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {wordCount > 0 && <span className="badge">{wordCount} words</span>}
              <button
                type="button"
                className="button secondary"
                onClick={handleCopy}
                disabled={!answer}
                style={{ fontSize: 12, padding: "4px 12px" }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={10}
            style={{ resize: "vertical", fontSize: 13, opacity: busy ? 0.55 : 1 }}
            disabled={busy}
          />

          {/* Refine */}
          <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
              <span style={{ opacity: 0.7 }}>✦</span> Refine with AI
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Describe what to change — tone, length, emphasis, or anything else.
            </p>
            <textarea
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder='e.g. "Make it shorter and more direct" or "Emphasize my leadership experience more"'
              rows={2}
              style={{ resize: "vertical", fontSize: 13 }}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRefine();
              }}
            />
            <button
              type="button"
              className="button secondary"
              onClick={handleRefine}
              disabled={!refinement.trim() || busy}
              style={{ justifyContent: "center" }}
            >
              {isRefining ? "Refining…" : "Refine with AI"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
