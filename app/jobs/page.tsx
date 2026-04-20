import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { JobFilters } from "@/components/JobFilters";
import { JobCard } from "@/components/JobCard";
import { NewJobsButton } from "@/components/NewJobsButton";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const profile = await getProfileForUserOrDefault(user?.id);
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  const sort = typeof params.sort === "string" && params.sort === "oldest" ? "oldest" : "recent";

  // Fetch the last completed sync's start time in parallel with jobs.
  // This becomes the "since" cursor for the new-jobs button — clicking it
  // reveals any jobs added during or after the most recent sync run.
  const lastSyncPromise = prisma.syncRun.findFirst({
    where: { finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });

  const [data, lastSync] = await Promise.all([
    listJobs({
      q: typeof params.q === "string" ? params.q : undefined,
      department: typeof params.department === "string" ? params.department : undefined,
      sort,
      workplaceType: typeof params.workplaceType === "string" ? params.workplaceType : undefined,
      employmentType: typeof params.employmentType === "string" ? params.employmentType : undefined,
      experienceLevel: typeof params.experienceLevel === "string" ? params.experienceLevel : undefined,
      location: typeof params.location === "string" ? params.location : undefined,
      states: typeof params.states === "string" ? params.states.split(",").filter(Boolean) : undefined,
      country: typeof params.country === "string" ? params.country : undefined,
      source: typeof params.source === "string" ? params.source : undefined,
      company: typeof params.company === "string" ? params.company : undefined,
      recommendedOnly: typeof params.recommendedOnly === "string" ? params.recommendedOnly === "true" : false,
      page,
      limit: 25,
    }, profile),
    lastSyncPromise,
  ]);

  const serializableParams = {
    q: typeof params.q === "string" ? params.q : undefined,
    department: typeof params.department === "string" ? params.department : undefined,
    sort: sort === "oldest" ? "oldest" : undefined,
    workplaceType: typeof params.workplaceType === "string" ? params.workplaceType : undefined,
    employmentType: typeof params.employmentType === "string" ? params.employmentType : undefined,
    experienceLevel: typeof params.experienceLevel === "string" ? params.experienceLevel : undefined,
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
      <aside className="sidebar stack compact-stack">
        <div>
          <div className="eyebrow">Search controls</div>
          <h2 className="section-title">Filter real jobs</h2>
        </div>
        <JobFilters />
      </aside>

      <section className="stack page-stack-lg">
        <div className="hero-grid card hero-card">
          <div className="stack compact-stack hero-copy">
            <div className="eyebrow">Live job board</div>
            <h1 className="section-title">Browse real synced jobs and tailor every application</h1>
            <p className="muted hero-lead">
              This board only shows synced jobs from live sources. The app combines public feeds with ATS boards it auto-discovers from company career pages, then uses your saved profile to rank fit, generate cover letters, and rewrite your resume for each role.
            </p>
            <div className="actions">
              <Link className="button" href={user ? "/dashboard" : "/register?next=/dashboard"}>{user ? "Open dashboard" : "Create account"}</Link>
              <Link className="button secondary" href={user ? "/recommended" : "/login?next=/recommended"}>Open best-fit jobs</Link>
              <Link className="button secondary" href="/companies?state=NC">Explore companies</Link>
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
                <div className="metric-value">{profile.skills.length}</div>
                <div className="metric-note">Used in job matching</div>
              </div>
              <div className="metric-card inset-card">
                <div className="metric-label">Focus titles</div>
                <div className="metric-value">{profile.targetTitles.length}</div>
                <div className="metric-note">Target roles on your account</div>
              </div>
            </div>
            <div className="feature-strip">
              <div className="feature-pill">Real jobs only</div>
              <div className="feature-pill">Auto-discovered sources</div>
              <div className="feature-pill">Job-specific cover letters</div>
              <div className="feature-pill">Resume rewrite by role</div>
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

          {/* Refresh button — shows jobs added since the last sync (or since page
              load if no sync has run yet). Never resets filters or pagination. */}
          {data.jobs.length > 0 && (
            <NewJobsButton
              sinceLastSync={
                lastSync?.startedAt.toISOString() ??
                (data.jobs[0] as any).createdAt as string
              }
              filters={serializableParams}
              userId={user?.id}
            />
          )}

          {data.jobs.length === 0 ? (
            <div className="inset-card">
              <p style={{ marginTop: 0 }}>No jobs matched your current filters.</p>
              <p className="muted" style={{ marginBottom: 0 }}>
                This board only shows real synced jobs. Clear your filters or run <code>npm run bootstrap</code> / <code>npm run sync:jobs</code> to auto-discover more supported sources and refresh live postings.
              </p>
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
