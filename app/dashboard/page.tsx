import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { MatchReasons } from "@/components/MatchReasons";

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
          <div className="eyebrow">Dashboard</div>
          <h1 className="section-title">Hey, {profile.name || user.displayName || user.email}</h1>
          <p className="muted hero-lead">
            Your top jobs and companies are ranked by profile fit. Pick a role and start tailoring.
          </p>
          <div className="actions">
            <Link className="button" href="/jobs">Browse jobs</Link>
            <Link className="button secondary" href="/profile">Edit profile</Link>
            <Link className="button secondary" href="/recommended">Best fit</Link>
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
          <p className="muted">Rewrite your resume for a specific role using your saved profile.</p>
          <Link className="button secondary" href="/resume-rewrite">Rewrite resume</Link>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">△</div>
          <h2 className="section-title">Resume tips</h2>
          <p className="muted">See keyword gaps and get suggestions tailored to the role.</p>
          <Link className="button secondary" href="/resume-feedback">Get tips</Link>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">✦</div>
          <h2 className="section-title">Cover letters</h2>
          <p className="muted">Generate a cover letter from your profile and the job description.</p>
          <Link className="button secondary" href="/cover-letters">Write letter</Link>
        </article>
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
