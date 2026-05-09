import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactTable } from "@/components/ContactTable";
import { MatchReasons } from "@/components/MatchReasons";
import { OutreachEditor } from "@/components/OutreachEditor";
import { SuggestedSearches } from "@/components/SuggestedSearches";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyBySlug } from "@/lib/companies";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const profile = user ? await getProfileForUserOrDefault(user.id) : null;
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
              <a
                className="button secondary"
                href={company.linkedinUrl ?? `https://www.linkedin.com/company/${company.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.98 1.98 0 0 1-1.983-1.98 1.98 1.98 0 1 1 1.983 1.98zm1.712 13.019H3.623V9h3.426v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
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
          <h2 className="section-title">Outreach messages</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Generate LinkedIn DMs, cold emails, informational asks, and follow-ups tailored to your profile and this company.
          </p>
          <OutreachEditor
            companyName={company.name}
            companyNotes={company.outreachTips ?? ""}
            companyFocus={[...company.stackTags, ...company.gameTags, ...company.roleFocusTags]}
            relatedRoles={company.relatedJobs.map((j: { title: string }) => j.title).slice(0, 8)}
            initialMessage={company.outreachMessage}
            name={profile?.name ?? ""}
            summary={profile?.summary ?? ""}
            skills={profile?.skills ?? []}
            stacks={profile?.stacks ?? []}
            workExperience={profile?.workExperience ?? []}
          />
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
              <Link className="button secondary" href={user ? `/ats-check/${job.id}` : `/login?next=/ats-check/${job.id}`}>ATS resume</Link>
              {job.primaryApplyUrl ? <a className="button secondary" href={job.primaryApplyUrl} target="_blank" rel="noreferrer">{job.primaryApplyLabel}</a> : null}
              {job.companyWebsiteUrl ? <a className="button secondary" href={job.companyWebsiteUrl} target="_blank" rel="noreferrer">Company home</a> : null}
            </div>
          </div>
        )) : <p className="muted">No matching jobs are currently in your feed for this company. Keep the company on your outreach list and re-run the sync to refresh openings.</p>}
      </section>
    </div>
  );
}
