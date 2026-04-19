export function SuggestedSearches({
  searches,
}: {
  searches: Array<{ label: string; query: string; linkedinUrl: string; googleUrl: string }>;
}) {
  return (
    <div className="stack compact-stack">
      {searches.map((search) => (
        <div key={search.query} className="card inset-card">
          <strong>{search.label}</strong>
          <p className="muted" style={{ margin: "8px 0" }}>{search.query}</p>
          <div className="actions">
            <a className="button secondary" href={search.linkedinUrl} target="_blank" rel="noreferrer">Search LinkedIn</a>
            <a className="button secondary" href={search.googleUrl} target="_blank" rel="noreferrer">Search web</a>
          </div>
        </div>
      ))}
    </div>
  );
}
