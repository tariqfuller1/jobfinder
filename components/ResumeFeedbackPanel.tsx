import Link from "next/link";
import type { ResumeFeedback } from "@/lib/resume-feedback";

export function ResumeFeedbackPanel({
  feedback,
  jobId,
  compact = false,
}: {
  feedback: ResumeFeedback;
  jobId?: string;
  compact?: boolean;
}) {
  return (
    <div className="stack compact-stack">
      <div>
        <h2 className="section-title">Resume improvement suggestions</h2>
        <p className="muted" style={{ margin: 0 }}>
          These suggestions compare the job language to your current profile so you can tailor your resume before applying.
        </p>
      </div>

      <div className="inset-card stack compact-stack">
        <div>
          <strong>Suggested headline</strong>
          <p className="muted" style={{ margin: "8px 0 0" }}>{feedback.headlineSuggestion}</p>
        </div>
        <div>
          <strong>Suggested summary</strong>
          <p className="muted" style={{ margin: "8px 0 0" }}>{feedback.summarySuggestion}</p>
        </div>
      </div>

      <div>
        <h3 className="section-title" style={{ marginBottom: 8 }}>Mirror these keywords</h3>
        <div className="badges">
          {feedback.keywordsToMirror.map((keyword) => (
            <span key={keyword} className="badge">{keyword}</span>
          ))}
        </div>
      </div>

      {feedback.matchStrengths.length ? (
        <div>
          <h3 className="section-title" style={{ marginBottom: 8 }}>Already strong for this role</h3>
          <div className="badges">
            {feedback.matchStrengths.map((keyword) => (
              <span key={keyword} className="badge badge-accent">{keyword}</span>
            ))}
          </div>
        </div>
      ) : null}

      {feedback.missingKeywords.length ? (
        <div>
          <h3 className="section-title" style={{ marginBottom: 8 }}>Possible gaps to address</h3>
          <div className="badges">
            {feedback.missingKeywords.map((keyword) => (
              <span key={keyword} className="badge">{keyword}</span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid-2 resume-feedback-grid">
        <div className="inset-card stack compact-stack">
          <strong>What to strengthen</strong>
          <ul className="feedback-list">
            {feedback.sectionsToStrengthen.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="inset-card stack compact-stack">
          <strong>Proof prompts</strong>
          <ul className="feedback-list">
            {feedback.proofPrompts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="inset-card stack compact-stack">
        <strong>Best next edits</strong>
        <ul className="feedback-list">
          {(compact ? feedback.improvementSteps.slice(0, 3) : feedback.improvementSteps).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="inset-card stack compact-stack">
        <strong>Bullet ideas to add or rewrite</strong>
        <ul className="feedback-list">
          {feedback.bulletPrompts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {!compact ? (
        <div className="inset-card stack compact-stack">
          <strong>Watch-outs</strong>
          <ul className="feedback-list">
            {feedback.cautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {jobId ? (
        <div className="actions">
          <Link className="button secondary" href={`/resume-feedback/${jobId}`}>Open full resume tips</Link>
          <Link className="button secondary" href={`/resume-rewrite/${jobId}`}>Rewrite full resume</Link>
        </div>
      ) : null}
    </div>
  );
}
