export function MatchReasons({ score, reasons, userId }: { score: number; reasons: string[]; userId?: string | null }) {
  if (score === 0 && reasons.length === 0) {
    return (
      <div style={{ flexShrink: 0 }}>
        <a
          href={userId ? "/profile" : "/login?next=/profile"}
          style={{
            fontSize: 12,
            color: "#6b7280",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            whiteSpace: "nowrap",
          }}
        >
          Set up profile for fit score
        </a>
      </div>
    );
  }

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
