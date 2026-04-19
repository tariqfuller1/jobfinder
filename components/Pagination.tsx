import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  pathname,
  searchParams,
}: {
  page: number;
  totalPages: number;
  pathname: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && value.length) params.set(key, value);
    }
    params.set("page", String(nextPage));
    return `${pathname}?${params.toString()}`;
  };

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === totalPages || Math.abs(value - page) <= 2,
  );

  return (
    <div className="card stack compact-stack">
      <div className="space-between" style={{ alignItems: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          Page {page} of {totalPages}
        </p>
        <div className="actions">
          {page > 1 ? (
            <Link className="button secondary" href={buildHref(page - 1)}>
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link className="button secondary" href={buildHref(page + 1)}>
              Next
            </Link>
          ) : null}
        </div>
      </div>

      <div className="actions">
        {pages.map((value, index) => {
          const prev = pages[index - 1];
          const needsGap = prev && value - prev > 1;
          return (
            <span key={value} style={{ display: "contents" }}>
              {needsGap ? <span className="muted pagination-gap">…</span> : null}
              <Link className={`button ${value === page ? "" : "secondary"}`} href={buildHref(value)}>
                {value}
              </Link>
            </span>
          );
        })}
      </div>
    </div>
  );
}
