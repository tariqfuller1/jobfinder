import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactTable } from "@/components/ContactTable";
import { MatchReasons } from "@/components/MatchReasons";
import { SuggestedSearches } from "@/components/SuggestedSearches";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyBySlug } from "@/lib/companies";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const profile = await getProfileForUserOrDefault(user?.id);
  const company = await getCompanyBySlug(slug, profile);

  if (!company) notFound();

  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <div className="grid-2">
        <article className="card hero-card stack">
          <div className="space-between">
            <div>
              <h1 className="section-title">{company.name}</h1>
              <p className="muted">{company.headquarters ?? "HQ not listed"} • {company.remotePolicy.replaceAll("_", " ")} • {company.companySize ?? "Size unknown"}</p>
            </div>
            <MatchReasons score={company.fitScore} reasons={company.fitReasons} />
          </div>

          <div className="badges">
            <span className="badge">{company.companyCategory}</span>
            <span className="badge">{company.relatedJobs.length} jobs in feed</span>
            {company.industryTags.map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
          </div>

          <div className="stack compact-stack">
            <div>
              <h3 className="section-title" style={{ marginBottom: 8 }}>Skill fit</h3>
              <div className="badges">
                {[...company.stackTags, ...company.gameTags, ...company.roleFocusTags].map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
              </div>
            </div>

            <div>
              <h3 className="section-title" style={{ marginBottom: 8 }}>Hiring regions</h3>
              <p className="muted">{company.hiringRegions.join(", ") || "Not listed"}</p>
            </div>

            <div>
              <h3 className="section-title" style={{ marginBottom: 8 }}>Cold outreach notes</h3>
              <p className="muted">{company.outreachTips ?? "Document outreach hooks here: shipped products, recent funding, growth, engine stack, or teams that match your background."}</p>
            </div>

            <div>
              <h3 className="section-title" style={{ marginBottom: 8 }}>Email patterns</h3>
              <p className="muted">{company.emailPatterns.join(", ") || "Add likely company email patterns as you verify them."}</p>
            </div>

            <div>
              <h3 className="section-title" style={{ marginBottom: 8 }}>ATS / hiring signals</h3>
              <div className="badges">
                {company.atsProviders.map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
                {company.hiringSignals.map((tag: string) => (<span key={tag} className="badge">{tag}</span>))}
              </div>
            </div>
          </div>
        </article>

        <aside className="card stack">
          <div>
            <h2 className="section-title">Outreach shortcuts</h2>
            <div className="actions">
              {company.websiteUrl ? <a className="button secondary" href={company.websiteUrl} target="_blank" rel="noreferrer">Website</a> : null}
              {company.careersUrl ? <a className="button secondary" href={company.careersUrl} target="_blank" rel="noreferrer">Careers</a> : null}
              {company.linkedinUrl ? <a className="button secondary" href={company.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a> : null}
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              {company.coldCallPhone ? `Main phone: ${company.coldCallPhone}` : "Add a verified recruiting or office phone number if you want to keep calling notes here."}
            </p>
          </div>

          <div>
            <h2 className="section-title">Suggested people to look for</h2>
            <p className="muted">These are safe, user-driven searches for recruiters, hiring managers, and engineering leaders without scraping LinkedIn profiles.</p>
            <SuggestedSearches searches={company.suggestedSearches} />
          </div>

          <div>
            <h2 className="section-title">Resume-based connection angles</h2>
            <p className="muted">These searches are generated from your saved account profile to help you find warmer intros.</p>
            <SuggestedSearches searches={company.connectionSearches} />
          </div>
        </aside>
      </div>

      <div className="grid-2">
        <section className="card stack">
          <h2 className="section-title">Outreach message draft</h2>
          <textarea readOnly value={company.outreachMessage} rows={13} />
        </section>

        <section className="card stack">
          <h2 className="section-title">People to track</h2>
          <ContactTable contacts={company.contacts} />
        </section>
      </div>

      <section className="card stack">
        <h2 className="section-title">Open roles from this company in your feed</h2>
        {company.relatedJobs.length ? company.relatedJobs.map((job: (typeof company.relatedJobs)[number]) => (
          <div key={job.id} className="inset-card stack compact-stack">
            <div className="space-between">
              <div>
                <strong><Link href={`/jobs/${job.id}`}>{job.title}</Link></strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>{job.location ?? "Location not listed"} • {job.workplaceType}</p>
              </div>
              <MatchReasons score={job.fitScore} reasons={job.fitReasons} />
            </div>
            <div className="actions">
              <Link className="button secondary" href={`/jobs/${job.id}`}>View job</Link>
              <Link className="button secondary" href={user ? `/cover-letters/${job.id}` : `/login?next=/cover-letters/${job.id}`}>Cover letter</Link>
              <Link className="button secondary" href={user ? `/resume-feedback/${job.id}` : `/login?next=/resume-feedback/${job.id}`}>Resume tips</Link>
              <Link className="button secondary" href={user ? `/resume-rewrite/${job.id}` : `/login?next=/resume-rewrite/${job.id}`}>Rewrite resume</Link>
              {job.primaryApplyUrl ? <a className="button secondary" href={job.primaryApplyUrl} target="_blank" rel="noreferrer">{job.primaryApplyLabel}</a> : null}
              {job.companyWebsiteUrl ? <a className="button secondary" href={job.companyWebsiteUrl} target="_blank" rel="noreferrer">Company home</a> : null}
            </div>
          </div>
        )) : <p className="muted">No matching jobs are currently in your feed for this company. Keep the company on your outreach list and re-run the sync to refresh openings.</p>}
      </section>
    </div>
  );
}
