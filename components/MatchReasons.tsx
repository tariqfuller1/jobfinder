export function MatchReasons({ score, reasons }: { score: number; reasons: string[]; userId?: string | null }) {
  if (score === 0 && reasons.length === 0) return null;

  return (
    <div className="stack compact-stack">
      <div className="badges">
        <span className="badge badge-accent">Fit score {score}</span>
        {reasons.map((reason) => (
          <span key={reason} className="badge">{reason}</span>
        ))}
      </div>
    </div>
  );
}

export function FitScorePrompt({ userId }: { userId?: string | null }) {
  return (
    <div className="inset-card" style={{ padding: "10px 14px" }}>
      <a
        href={userId ? "/profile" : "/login?next=/profile"}
        style={{ fontSize: 13, color: "#a1a1aa", textDecoration: "underline", textUnderlineOffset: 3 }}
      >
        Set up your profile to see fit scores for every job
      </a>
    </div>
  );
}
