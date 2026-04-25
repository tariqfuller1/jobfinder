import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { MatchReasons } from "@/components/MatchReasons";
import { getCurrentUser } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { listJobs } from "@/lib/jobs";
import { defaultUserProfile } from "@/lib/profile";

// Cache the public landing data for 5 minutes — it only changes after a sync.
const getLandingData = unstable_cache(
  async () => {
    const [jobs, companies] = await Promise.all([
      listJobs({ page: 1, limit: 6 }, null),
      listCompanies({ page: 1, limit: 6, activeHiring: "true" }, defaultUserProfile),
    ]);
    return { jobs, companies };
  },
  ["landing-data"],
  { revalidate: 300, tags: ["jobs"] },
);

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const { jobs, companies } = await getLandingData();

  return (
    <div className="stack page-stack-lg marketing-page" style={{ padding: "24px 0 40px" }}>
      <section className="hero-grid card hero-card marketing-hero">
        <div className="stack compact-stack hero-copy">
          <div className="eyebrow">Marketing homepage</div>
          <h1 className="section-title">A real-job search workspace with resume tailoring built in</h1>
          <p className="muted hero-lead">
            Save your resume to your account, set preferences and target locations, browse only real synced jobs, and let the app auto-discover more career-page sources before generating tailored cover letters and resume rewrites for each role.
          </p>
          <div className="actions">
            <Link className="button" href="/register?next=/dashboard">Create your account</Link>
            <Link className="button secondary" href="/login?next=/dashboard">Sign in</Link>
            <Link className="button secondary" href="/jobs">Browse live jobs</Link>
          </div>
          <div className="feature-strip">
            <div className="feature-pill">Real synced jobs only</div>
            <div className="feature-pill">Auto-discovered ATS sources</div>
            <div className="feature-pill">Resume saved to account</div>
            <div className="feature-pill">Job-specific resume rewrite</div>
          </div>
        </div>

        <div className="hero-panel stack compact-stack">
          <div className="metric-grid">
            <div className="metric-card inset-card">
              <div className="metric-label">Live jobs</div>
              <div className="metric-value">{jobs.total}</div>
              <div className="metric-note">Live sources + public feeds</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Tracked companies</div>
              <div className="metric-value">{companies.total}</div>
              <div className="metric-note">For research and outreach</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Tailoring tools</div>
              <div className="metric-value">3</div>
              <div className="metric-note">Cover letters, tips, rewrites</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Account features</div>
              <div className="metric-value">Resume</div>
              <div className="metric-note">Saved profile, preferences, and tracker</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-3">
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">⌘</div>
          <h2 className="section-title">Live jobs</h2>
          <p className="muted">The site pulls from synced public feeds and automatically discovered ATS boards. No example starter jobs are shown on the board.</p>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">◫</div>
          <h2 className="section-title">Saved profile</h2>
          <p className="muted">Upload your resume, save job preferences and locations, and keep everything tied to your own account.</p>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">✎</div>
          <h2 className="section-title">Tailor by role</h2>
          <p className="muted">Build a cover letter, get resume advice, and rewrite your resume for each job from one workspace.</p>
        </article>
      </section>

      <section className="grid-2">
        <article className="card stack">
          <div className="space-between section-heading-row">
            <div>
              <div className="eyebrow">Live preview</div>
              <h2 className="section-title">Latest real jobs</h2>
            </div>
            <Link href="/jobs" className="button secondary">View full job board</Link>
          </div>
          {jobs.jobs.length === 0 ? (
            <div className="inset-card">
              <p style={{ marginTop: 0 }}>No live jobs are available yet.</p>
              <p className="muted" style={{ marginBottom: 0 }}>Run <code>npm run bootstrap</code> or <code>npm run sync:jobs</code> after setup to auto-discover supported sources and populate the board with real postings.</p>
            </div>
          ) : jobs.jobs.map((job) => (
            <div key={job.id} className="inset-card stack compact-stack">
              <div className="space-between">
                <div>
                  <strong><Link href={`/jobs/${job.id}`}>{job.title}</Link></strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>{job.company} • {job.location ?? "Location not listed"}</p>
                </div>
                <MatchReasons score={job.fitScore} reasons={job.fitReasons} />
              </div>
            </div>
          ))}
        </article>

        <article className="card stack">
          <div className="space-between section-heading-row">
            <div>
              <div className="eyebrow">Research-ready</div>
              <h2 className="section-title">Company directory</h2>
            </div>
            <Link href="/companies" className="button secondary">Explore companies</Link>
          </div>
          {companies.companies.slice(0, 6).map((company) => (
            <div key={company.id} className="inset-card stack compact-stack">
              <div className="space-between">
                <div>
                  <strong><Link href={`/companies/${company.slug}`}>{company.name}</Link></strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>{company.headquarters ?? "HQ not listed"} • {company.openJobCount} open jobs</p>
                </div>
                <MatchReasons score={company.fitScore} reasons={company.fitReasons} />
              </div>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
