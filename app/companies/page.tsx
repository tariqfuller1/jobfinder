import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CompanyFilters } from "@/components/CompanyFilters";
import { FitScorePrompt, MatchReasons } from "@/components/MatchReasons";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { getCurrentUser } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const profile = user ? await getProfileForUserOrDefault(user.id) : null;
  const data = await listCompanies({
    q: typeof params.q === "string" ? params.q : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    remotePolicy: typeof params.remotePolicy === "string" ? params.remotePolicy : undefined,
    skill: typeof params.skill === "string" ? params.skill : undefined,
    location: typeof params.location === "string" ? params.location : undefined,
    size: typeof params.size === "string" ? params.size : undefined,
    state: typeof params.state === "string" ? params.state : undefined,
    country: typeof params.country === "string" ? params.country : undefined,
    ats: typeof params.ats === "string" ? params.ats : undefined,
    activeHiring: typeof params.activeHiring === "string" ? params.activeHiring : undefined,
    sort: typeof params.sort === "string" ? params.sort : undefined,
    page: typeof params.page === "string" ? Number(params.page) : 1,
  }, profile);

  const activeHiringCount = data.companies.filter((company) => company.activeHiring).length;

  const serializableParams = {
    q: typeof params.q === "string" ? params.q : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    remotePolicy: typeof params.remotePolicy === "string" ? params.remotePolicy : undefined,
    skill: typeof params.skill === "string" ? params.skill : undefined,
    location: typeof params.location === "string" ? params.location : undefined,
    size: typeof params.size === "string" ? params.size : undefined,
    state: typeof params.state === "string" ? params.state : undefined,
    country: typeof params.country === "string" ? params.country : undefined,
    ats: typeof params.ats === "string" ? params.ats : undefined,
    activeHiring: typeof params.activeHiring === "string" ? params.activeHiring : undefined,
    sort: typeof params.sort === "string" ? params.sort : undefined,
  };

  return (
    <div className="stack page-stack-lg" style={{ padding: "28px 0 44px" }}>
      <section className="stack page-stack-lg">
        <div className="hero-grid card hero-card">
          <div className="stack compact-stack hero-copy">
            <div className="eyebrow">Company research</div>
            <h1 className="section-title">Find the right companies</h1>
            <p className="muted hero-lead">
              See who's hiring, filter by stack and location, and prioritize based on your profile.
            </p>
            <div className="actions">
              <Link href="/companies?state=NC" className="button">North Carolina focus</Link>
              <Link href="/companies?category=GAMING" className="button secondary">Game companies</Link>
              <Link href="/companies?category=SOFTWARE" className="button secondary">Software companies</Link>
            </div>
          </div>
          <div className="hero-panel stack compact-stack">
            <div className="metric-grid metric-grid-tight">
              <div className="metric-card inset-card">
                <div className="metric-label">Companies</div>
                <div className="metric-value">{data.total}</div>
                <div className="metric-note">In your directory</div>
              </div>
              <div className="metric-card inset-card">
                <div className="metric-label">Hiring now</div>
                <div className="metric-value">{activeHiringCount}</div>
                <div className="metric-note">On this page</div>
              </div>
              <div className="metric-card inset-card">
                <div className="metric-label">Profile skills</div>
                <div className="metric-value">{profile?.skills.length ?? 0}</div>
                <div className="metric-note">Used in company fit</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-between section-heading-row">
          <div className="muted">Page {data.page} of {data.totalPages} — {data.total} companies</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}><SearchBar placeholder="Search by name, location, stack, tags…" /></div>
          <CompanyFilters />
        </div>

        {!profile ? <FitScorePrompt userId={user?.id} /> : null}

        {data.companies.map((company: (typeof data.companies)[number]) => (
          <article key={company.id} className="card hero-card stack">
            <div className="space-between">
              <div>
                <h3 style={{ margin: 0 }}><Link href={`/companies/${company.slug}`}>{company.name}</Link></h3>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {company.headquarters ?? "HQ not listed"} • {company.remotePolicy.replaceAll("_", " ")} • {company.companySize ?? "Size unknown"}
                </p>
              </div>
              <MatchReasons score={company.fitScore} reasons={company.fitReasons} userId={user?.id} />
            </div>

            <div className="badges">
              <span className="badge">{company.companyCategory}</span>
              {company.activeHiring ? <span className="badge">Hiring</span> : <span className="badge">Watchlist</span>}
              <span className="badge">{company.openJobCount} open jobs</span>
              {company.atsProviders.slice(0, 2).map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
            </div>

            <div className="badges">
              {company.stackTags.slice(0, 4).map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
              {company.gameTags.slice(0, 3).map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
              {company.roleFocusTags.slice(0, 3).map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
            </div>

            <p className="muted">{company.notes ?? "Add research notes, interview prep bullets, alumni, and outreach hooks here."}</p>

            {company.recentJob ? (
              <Link
                href={`/jobs/${company.recentJob.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>
                    Latest posting
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {company.recentJob.title}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  {company.recentJob.workplaceType === "REMOTE" && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#4ade80", marginBottom: 2 }}>Remote</div>
                  )}
                  {company.recentJob.workplaceType === "HYBRID" && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#60a5fa", marginBottom: 2 }}>Hybrid</div>
                  )}
                  {company.recentJob.postedAt && (
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {formatDistanceToNow(new Date(company.recentJob.postedAt), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </Link>
            ) : null}

            <div className="actions">
              <Link href={`/companies/${company.slug}`} className="button">View company</Link>
              {company.careersUrl ? <a className="button secondary" href={company.careersUrl} target="_blank" rel="noreferrer">Careers page</a> : null}
              {company.websiteUrl ? <a className="button secondary" href={company.websiteUrl} target="_blank" rel="noreferrer">Website</a> : null}
            </div>
          </article>
        ))}
        <Pagination page={data.page} totalPages={data.totalPages} pathname="/companies" searchParams={serializableParams} />
      </section>
    </div>
  );
}
