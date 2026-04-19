import Link from "next/link";
import { MatchReasons } from "@/components/MatchReasons";
import { requireCurrentUser } from "@/lib/auth";
import { listCompanies, listTopCompanyMatches } from "@/lib/companies";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function RecommendedPage() {
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const [jobs, companies, topCompanyMatches] = await Promise.all([
    listJobs({ page: 1, limit: 20, recommendedOnly: true }, profile),
    listCompanies({ page: 1, limit: 20, activeHiring: "true" }, profile),
    listTopCompanyMatches(10, profile),
  ]);

  return (
    <div className="stack page-stack-lg" style={{ padding: "24px 0 40px" }}>
      <section className="hero-grid card hero-card">
        <div className="stack compact-stack hero-copy">
          <div className="eyebrow">Best-fit dashboard</div>
          <h1 className="section-title">Your highest-value targets, ranked</h1>
          <p className="muted hero-lead">
            Built for {profile.name}. This dashboard ranks jobs, companies, and outreach targets against the resume and preferences saved to your account profile.
          </p>
          <div className="badges">
            {profile.skills.slice(0, 8).map((skill) => (
              <span key={skill} className="badge">{skill}</span>
            ))}
          </div>
        </div>
        <div className="hero-panel stack compact-stack">
          <div className="metric-grid metric-grid-tight">
            <div className="metric-card inset-card">
              <div className="metric-label">Top-fit jobs</div>
              <div className="metric-value">{jobs.jobs.length}</div>
              <div className="metric-note">Sorted by your profile</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Priority companies</div>
              <div className="metric-value">{topCompanyMatches.length}</div>
              <div className="metric-note">Strong match signals</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Hiring companies</div>
              <div className="metric-value">{companies.total}</div>
              <div className="metric-note">In your company directory</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <article className="card hero-card stack">
          <div className="space-between section-heading-row">
            <div>
              <div className="eyebrow">Action first</div>
              <h2 className="section-title">Top jobs</h2>
            </div>
            <Link href="/jobs" className="button secondary">All jobs</Link>
          </div>
          {jobs.jobs.map((job) => (
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

      <section className="card stack">
        <div className="space-between section-heading-row">
          <div>
            <div className="eyebrow">Hiring now</div>
            <h2 className="section-title">Active-hiring companies worth prioritizing</h2>
          </div>
          <Link href="/profile" className="button secondary">Update preferences</Link>
        </div>
        {companies.companies.slice(0, 10).map((company) => (
          <div key={company.id} className="inset-card space-between">
            <div>
              <strong><Link href={`/companies/${company.slug}`}>{company.name}</Link></strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>{company.companyCategory} • {company.remotePolicy.replaceAll("_", " ")} • {company.openJobCount} open jobs</p>
            </div>
            <MatchReasons score={company.fitScore} reasons={company.fitReasons} />
          </div>
        ))}
      </section>
    </div>
  );
}
