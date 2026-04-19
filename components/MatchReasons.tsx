export function MatchReasons({ score, reasons }: { score: number; reasons: string[] }) {
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
