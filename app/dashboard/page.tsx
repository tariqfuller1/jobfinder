import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { MatchReasons } from "@/components/MatchReasons";
import { QuickLinks } from "@/components/QuickLinks";

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
          <h2 className="section-title">ATS resume</h2>
          <p className="muted">Score your resume against a job, auto-improve it, and download a tailored PDF.</p>
          <Link className="button secondary" href="/jobs">Pick a job</Link>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">✦</div>
          <h2 className="section-title">Cover letters</h2>
          <p className="muted">Generate a cover letter from your profile and the job description.</p>
          <Link className="button secondary" href="/cover-letters">Write letter</Link>
        </article>
        <article className="card stack compact-stack feature-card">
          <div className="feature-icon">◎</div>
          <h2 className="section-title">Edit profile</h2>
          <p className="muted">Update your skills, experience, resume, and links to sharpen your job fit scores.</p>
          <Link className="button secondary" href="/profile">Go to profile</Link>
        </article>
      </section>

      {profile.links.length > 0 && (
        <section className="card stack compact-stack">
          <div>
            <div className="eyebrow">Quick access</div>
            <h2 className="section-title">Your links</h2>
          </div>
          <QuickLinks links={profile.links} />
        </section>
      )}

      {process.env.NEXT_PUBLIC_DONATION_URL && (
        <section>
          <a
            href={process.env.NEXT_PUBLIC_DONATION_URL}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none", display: "block" }}
          >
            <div className="card" style={{
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              background: "linear-gradient(135deg, rgba(20,14,10,0.98), rgba(12,8,5,1))",
              borderColor: "rgba(251,191,36,0.2)",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>☕</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f5", marginBottom: 3 }}>
                    Enjoying Hyrd?
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    If it's helped with your job search, consider buying me a coffee. It keeps the site running.
                  </p>
                </div>
              </div>
              <div className="button" style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.12))",
                border: "1px solid rgba(251,191,36,0.35)",
                color: "#fbbf24",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
                Support Hyrd ↗
              </div>
            </div>
          </a>
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
              <p style={{ marginTop: 0, fontWeight: 600 }}>No matches yet.</p>
              <p className="muted" style={{ marginBottom: 0 }}>
                Upload your resume on the{" "}
                <Link href="/profile" style={{ color: "#ff3368" }}>profile page</Link>{" "}
                so we can score jobs against your skills and preferred locations.
                You can also{" "}
                <Link href="/jobs" style={{ color: "#ff3368" }}>browse all live jobs</Link>{" "}
                directly.
              </p>
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
                <Link className="button secondary" href={`/ats-check/${job.id}`}>ATS resume</Link>
                <Link className="button secondary" href={`/outreach/${job.id}`}>Outreach</Link>
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
