import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { MatchReasons } from "@/components/MatchReasons";
import { SyncButton } from "@/components/SyncButton";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const [jobs, companies] = await Promise.all([
    listJobs({ page: 1, limit: 8, recommendedOnly: true }, profile),
    listCompanies({ page: 1, limit: 8, activeHiring: "true" }, profile),
  ]);
  // Derive top matches from already-fetched companies — avoids a second DB round-trip
  const topCompanyMatches = [...companies.companies].sort((a, b) => b.fitScore - a.fitScore).slice(0, 6);

  return (
    <div className="stack page-stack-lg" style={{ padding: "24px 0 40px" }}>
      <section className="hero-grid card hero-card">
        <div className="stack compact-stack hero-copy">
          <div className="eyebrow">Signed-in dashboard</div>
          <h1 className="section-title">Welcome back, {profile.name || user.displayName || user.email}</h1>
          <p className="muted hero-lead">
            This dashboard is built from your saved resume, preferences, and target roles. Jump into the highest-fit jobs, rewrite your resume for a role, or move into company research and outreach while the sync layer keeps widening source coverage.
          </p>
          <div className="actions">
            <Link className="button" href="/jobs">Browse all live jobs</Link>
            <Link className="button secondary" href="/profile">Update profile</Link>
            <Link className="button secondary" href="/recommended">Open best-fit view</Link>
          </div>
        </div>
        <div className="hero-panel stack compact-stack">
          <div className="metric-grid">
            <div className="metric-card inset-card">
              <div className="metric-label">Top-fit jobs</div>
              <div className="metric-value">{jobs.jobs.length}</div>
              <div className="metric-note">Personalized to your profile</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Priority companies</div>
              <div className="metric-value">{topCompanyMatches.length}</div>
              <div className="metric-note">Worth researching first</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Saved skills</div>
              <div className="metric-value">{profile.skills.length}</div>
              <div className="metric-note">Used for fit scoring</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Hiring companies</div>
              <div className="metric-value">{companies.total}</div>
              <div className="metric-note">Tracked in your directory</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-3">
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">✎</div>
          <h2 className="section-title">Resume rewriter</h2>
          <p className="muted">Build a tailored version of your resume for a specific job using the profile saved to your account.</p>
          <Link className="button secondary" href="/resume-rewrite">Open rewriter</Link>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">△</div>
          <h2 className="section-title">Resume tips</h2>
          <p className="muted">See gaps, mirror keywords, and get role-specific suggestions before you apply.</p>
          <Link className="button secondary" href="/resume-feedback">Open resume tips</Link>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">✦</div>
          <h2 className="section-title">Cover letters</h2>
          <p className="muted">Generate a targeted cover letter from your profile, the job description, and the company context.</p>
          <Link className="button secondary" href="/cover-letters">Open cover letters</Link>
        </article>
      </section>

      <section className="card stack compact-stack">
        <div>
          <div className="eyebrow">Job data</div>
          <h2 className="section-title">Sync job board</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Pull fresh listings from all configured sources. Each source reports as it finishes so you can see exactly what was fetched.
          </p>
        </div>
        <SyncButton />
      </section>

      {profile.links.length > 0 && (
        <section className="card stack compact-stack">
          <div>
            <div className="eyebrow">Quick access</div>
            <h2 className="section-title">Your links</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
                style={{ fontSize: 13 }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="grid-2">
        <article className="card hero-card stack">
          <div className="space-between section-heading-row">
            <div>
              <div className="eyebrow">Best next moves</div>
              <h2 className="section-title">Top jobs</h2>
            </div>
            <Link href="/jobs" className="button secondary">All live jobs</Link>
          </div>
          {jobs.jobs.length === 0 ? (
            <div className="inset-card">
              <p style={{ marginTop: 0 }}>No live jobs are available yet.</p>
              <p className="muted" style={{ marginBottom: 0 }}>Run <code>npm run bootstrap</code> or <code>npm run sync:jobs</code> to auto-discover more sources and pull in live postings.</p>
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
              <div className="actions">
                <Link className="button secondary" href={`/cover-letters/${job.id}`}>Cover letter</Link>
                <Link className="button secondary" href={`/resume-feedback/${job.id}`}>Resume tips</Link>
                <Link className="button secondary" href={`/resume-rewrite/${job.id}`}>Rewrite resume</Link>
              </div>
            </div>
          ))}
        </article>

        <article className="card stack">
          <div className="space-between section-heading-row">
            <div>
              <div className="eyebrow">Research queue</div>
              <h2 className="section-title">Top companies</h2>
            </div>
            <Link href="/companies" className="button secondary">Company hub</Link>
          </div>
          {topCompanyMatches.map((company) => (
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
