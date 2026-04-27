import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { JobFilters } from "@/components/JobFilters";
import { JobCard } from "@/components/JobCard";
import { FitScorePrompt } from "@/components/MatchReasons";
import { SidebarToggle } from "@/components/SidebarToggle";
import { getCurrentUser } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const profile = user ? await getProfileForUserOrDefault(user.id) : null;
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  const sortParam = typeof params.sort === "string" ? params.sort : "";
  const sort = (["oldest", "fit", "salary"].includes(sortParam) ? sortParam : "recent") as "recent" | "oldest" | "fit" | "salary";

  const parseList = (v: unknown) => typeof v === "string" ? v.split(",").filter(Boolean) : undefined;

  const data = await listJobs({
      q: typeof params.q === "string" ? params.q : undefined,
      departments: parseList(params.departments),
      sort,
      workplaceTypes: parseList(params.workplaceTypes),
      employmentTypes: parseList(params.employmentTypes),
      experienceLevels: parseList(params.experienceLevels),
      location: typeof params.location === "string" ? params.location : undefined,
      states: parseList(params.states),
      country: typeof params.country === "string" ? params.country : undefined,
      source: typeof params.source === "string" ? params.source : undefined,
      company: typeof params.company === "string" ? params.company : undefined,
      recommendedOnly: typeof params.recommendedOnly === "string" ? params.recommendedOnly === "true" : false,
      page,
      limit: 25,
    }, profile);

  const serializableParams = {
    q: typeof params.q === "string" ? params.q : undefined,
    departments: typeof params.departments === "string" ? params.departments : undefined,
    sort: sort !== "recent" ? sort : undefined,
    workplaceTypes: typeof params.workplaceTypes === "string" ? params.workplaceTypes : undefined,
    employmentTypes: typeof params.employmentTypes === "string" ? params.employmentTypes : undefined,
    experienceLevels: typeof params.experienceLevels === "string" ? params.experienceLevels : undefined,
    location: typeof params.location === "string" ? params.location : undefined,
    states: typeof params.states === "string" ? params.states : undefined,
    country: typeof params.country === "string" ? params.country : undefined,
    source: typeof params.source === "string" ? params.source : undefined,
    company: typeof params.company === "string" ? params.company : undefined,
    recommendedOnly: typeof params.recommendedOnly === "string" ? params.recommendedOnly : undefined,
  };

  const reliableApplyCount = data.jobs.filter((job) => job.hasReliableApplyLink).length;

  return (
    <div className="layout">
      <aside className="sidebar">
        <SidebarToggle>
          <div className="stack compact-stack">
            <div>
              <div className="eyebrow">Search controls</div>
              <h2 className="section-title">Filter real jobs</h2>
            </div>
            <JobFilters />
          </div>
        </SidebarToggle>
      </aside>

      <section className="stack page-stack-lg">
        <div className="hero-grid card hero-card">
          <div className="stack compact-stack hero-copy">
            <div className="eyebrow">Live job board</div>
            <h1 className="section-title">Real jobs, ranked by fit</h1>
            <p className="muted hero-lead">
              Live postings from ATS boards and public feeds, scored against your profile.
            </p>
            <div className="actions">
              <Link className="button" href={user ? "/dashboard" : "/register?next=/dashboard"}>{user ? "Dashboard" : "Create account"}</Link>
              <Link className="button secondary" href={user ? "/recommended" : "/login?next=/recommended"}>Best fit</Link>
              <Link className="button secondary" href="/companies?state=NC">Companies</Link>
            </div>
          </div>

          <div className="hero-panel stack compact-stack">
            <div className="metric-grid">
              <div className="metric-card inset-card">
                <div className="metric-label">Live jobs</div>
                <div className="metric-value">{data.total}</div>
                <div className="metric-note">Real synced postings only</div>
              </div>
              <div className="metric-card inset-card">
                <div className="metric-label">Apply-ready on page</div>
                <div className="metric-value">{reliableApplyCount}</div>
                <div className="metric-note">Direct or safe fallback links</div>
              </div>
              <div className="metric-card inset-card">
                <div className="metric-label">Profile skills</div>
                <div className="metric-value">{profile?.skills.length ?? 0}</div>
                <div className="metric-note">Used in job matching</div>
              </div>
              <div className="metric-card inset-card">
                <div className="metric-label">Focus titles</div>
                <div className="metric-value">{profile?.targetTitles.length ?? 0}</div>
                <div className="metric-note">Target roles on your account</div>
              </div>
            </div>
            <div className="feature-strip">
              <div className="feature-pill">Live sources</div>
              <div className="feature-pill">Fit scoring</div>
              <div className="feature-pill">Cover letters</div>
              <div className="feature-pill">Resume rewriter</div>
            </div>
          </div>
        </div>

        <section className="grid-3">
          <article className="card stack compact-stack feature-card">
            <div className="feature-icon">✦</div>
            <h2 className="section-title">Tailor fast</h2>
            <p className="muted">Generate cover letters, resume tips, and full rewrites from your saved profile for every target role.</p>
          </article>
          <article className="card stack compact-stack feature-card">
            <div className="feature-icon">◎</div>
            <h2 className="section-title">See fit instantly</h2>
            <p className="muted">Job and company scores are built from your resume, job preferences, locations, and target titles.</p>
          </article>
          <article className="card stack compact-stack feature-card">
            <div className="feature-icon">▣</div>
            <h2 className="section-title">Research companies</h2>
            <p className="muted">Move from the job board into company pages, connection search ideas, and targeted outreach planning.</p>
          </article>
        </section>

        <section className="card stack">
          <div className="space-between section-heading-row">
            <div>
              <div className="eyebrow">Search results</div>
              <h2 className="section-title">{data.total.toLocaleString()} live jobs</h2>
            </div>
            <div className="muted">Page {data.page} of {data.totalPages}</div>
          </div>


          {!profile ? <FitScorePrompt userId={user?.id} /> : null}

          {data.jobs.length === 0 ? (
            <div className="inset-card">
              <p style={{ marginTop: 0, marginBottom: 0 }}>No jobs matched your filters. Try clearing some.</p>
            </div>
          ) : null}

          {data.jobs.map((job) => (
            <JobCard key={job.id} job={job} userId={user?.id} />
          ))}

          <Pagination page={data.page} totalPages={data.totalPages} pathname="/jobs" searchParams={serializableParams} />
        </section>
      </section>
    </div>
  );
}
