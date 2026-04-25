import Link from "next/link";
import { CompanyFilters } from "@/components/CompanyFilters";
import { FitScorePrompt, MatchReasons } from "@/components/MatchReasons";
import { Pagination } from "@/components/Pagination";
import { SidebarToggle } from "@/components/SidebarToggle";
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
    ats: typeof params.ats === "string" ? params.ats : undefined,
    activeHiring: typeof params.activeHiring === "string" ? params.activeHiring : undefined,
    sort: typeof params.sort === "string" ? params.sort : undefined,
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <SidebarToggle>
          <div className="stack compact-stack">
            <div>
              <div className="eyebrow">Refine list</div>
              <h2 className="section-title">Company filters</h2>
            </div>
            <CompanyFilters />
          </div>
        </SidebarToggle>
      </aside>

      <section className="stack page-stack-lg">
        <div className="hero-grid card hero-card">
          <div className="stack compact-stack hero-copy">
            <div className="eyebrow">Outreach and research hub</div>
            <h1 className="section-title">Build a smarter target-company list</h1>
            <p className="muted hero-lead">
              Search companies, spot who is actively hiring, and use your saved profile to prioritize the right places to apply and network.
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
