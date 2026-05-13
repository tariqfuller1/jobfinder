import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactTable } from "@/components/ContactTable";
import { EmailGuesses } from "@/components/EmailGuesses";
import { MatchReasons } from "@/components/MatchReasons";
import { OutreachEditor } from "@/components/OutreachEditor";
import { SuggestedSearches } from "@/components/SuggestedSearches";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyBySlug } from "@/lib/companies";
import { extractDomainFromUrl, guessOutreachEmails, suggestEmailsWithAI } from "@/lib/email-finder";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const profile = user ? await getProfileForUserOrDefault(user.id) : null;
  const company = await getCompanyBySlug(slug, profile);

  if (!company) notFound();

  const allTags = [...company.stackTags, ...company.gameTags, ...company.roleFocusTags];

  const patternGuesses = guessOutreachEmails(company.websiteUrl, company.emailPatterns, company.contacts);
  const domain = extractDomainFromUrl(company.websiteUrl) ?? (company.emailPatterns.length > 0 ? company.emailPatterns[0].split("@")[1] ?? null : null);
  const aiGuesses = await suggestEmailsWithAI(company.name, domain, company.emailPatterns, company.companyCategory);

  // Merge: pattern guesses first, then AI suggestions that aren't already covered
  const patternEmails = new Set(patternGuesses.map((e) => e.email.toLowerCase()));
  const emailGuesses = [
    ...patternGuesses,
    ...aiGuesses.filter((e) => !patternEmails.has(e.email.toLowerCase())),
  ];

  const hasIntel =
    company.connectionSearches.length > 0 ||
    company.atsProviders.length > 0 ||
    company.hiringSignals.length > 0 ||
    company.emailPatterns.length > 0 ||
    company.coldCallPhone ||
    company.outreachTips ||
    company.hiringRegions.length > 0;

  return (
    <div style={{ padding: "24px 0 48px", display: "grid", gap: 20 }}>

      {/* ── Company header ── */}
      <div className="card hero-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "clamp(1.35rem,2vw,1.9rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
                {company.name}
              </h1>
              <MatchReasons score={company.fitScore} reasons={company.fitReasons} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 13, color: "#9ca3af" }}>
              {company.headquarters && <span>{company.headquarters}</span>}
              <span>{company.remotePolicy.replaceAll("_", " ")}</span>
              {company.companySize && <span>{company.companySize}</span>}
              <span>{company.companyCategory}</span>
              <span>{company.relatedJobs.length} open jobs in feed</span>
            </div>
            {allTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {allTags.slice(0, 10).map((tag: string) => (
                  <span key={tag} className="badge" style={{ fontSize: 11, minHeight: 24, padding: "3px 9px" }}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            {company.websiteUrl && (
              <a className="button secondary" href={company.websiteUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, minHeight: 36, padding: "8px 13px" }}>Website</a>
            )}
            {company.careersUrl && (
              <a className="button secondary" href={company.careersUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, minHeight: 36, padding: "8px 13px" }}>Careers</a>
            )}
            <a
              className="button secondary"
              href={company.linkedinUrl ?? `https://www.linkedin.com/company/${company.slug}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: 12, minHeight: 36, padding: "8px 13px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.98 1.98 0 0 1-1.983-1.98 1.98 1.98 0 1 1 1.983 1.98zm1.712 13.019H3.623V9h3.426v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      {/* ── Outreach row: editor + who to contact ── */}
      <div id="outreach" className="main-sidebar-grid">

        {/* Outreach editor */}
        <div className="card" style={{ padding: "20px 22px", display: "grid", gap: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Company outreach</div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Write to {company.name}
            </h2>
          </div>
          <OutreachEditor
            companyName={company.name}
            companyNotes={company.outreachTips ?? ""}
            companyFocus={allTags}
            relatedRoles={company.relatedJobs.map((j: { title: string }) => j.title).slice(0, 8)}
            initialMessage={company.outreachMessage}
            name={profile?.name ?? ""}
            summary={profile?.summary ?? ""}
            skills={profile?.skills ?? []}
            stacks={profile?.stacks ?? []}
            workExperience={profile?.workExperience ?? []}
          />
        </div>

        {/* Who to contact — scrollable, never taller than viewport */}
        {company.suggestedSearches.length > 0 && (
          <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "min(520px, 80vh)", overflow: "hidden" }}>
            <div style={{ flexShrink: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 2 }}>Who to contact</div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Recruiters, hiring managers, and engineering leads at {company.name}.
              </p>
            </div>
            <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
              <SuggestedSearches searches={company.suggestedSearches} />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom row: open roles + company intel ── */}
      <div className="content-sidebar-grid">

        {/* Open roles */}
        <section className="card" style={{ padding: "18px 20px", display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Open roles in your feed
          </h2>
          {company.relatedJobs.length ? company.relatedJobs.map((job: (typeof company.relatedJobs)[number]) => (
            <div key={job.id} className="inset-card" style={{ padding: "12px 14px", display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <Link href={`/jobs/${job.id}`} style={{ fontWeight: 600, fontSize: 14, color: "#f5f5f5" }}>{job.title}</Link>
                  <p className="muted" style={{ margin: "3px 0 0", fontSize: 12 }}>
                    {job.location ?? "Location not listed"} · {job.workplaceType.toLowerCase().replace("_", "-")}
                  </p>
                </div>
                <MatchReasons score={job.fitScore} reasons={job.fitReasons} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <Link className="button secondary" href={`/jobs/${job.id}`}
                  style={{ fontSize: 12, minHeight: 32, padding: "6px 12px" }}>View job</Link>
                <Link className="button secondary"
                  href={user ? `/cover-letters/${job.id}` : `/login?next=/cover-letters/${job.id}`}
                  style={{ fontSize: 12, minHeight: 32, padding: "6px 12px" }}>Cover letter</Link>
                <Link className="button secondary"
                  href={user ? `/ats-check/${job.id}` : `/login?next=/ats-check/${job.id}`}
                  style={{ fontSize: 12, minHeight: 32, padding: "6px 12px" }}>ATS resume</Link>
                {job.primaryApplyUrl && (
                  <a className="button secondary" href={job.primaryApplyUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, minHeight: 32, padding: "6px 12px" }}>{job.primaryApplyLabel}</a>
                )}
              </div>
            </div>
          )) : (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              No matching jobs currently in your feed. Re-run the sync to refresh.
            </p>
          )}
        </section>

        {/* Right: people to track + company intel */}
        <div style={{ display: "grid", gap: 14 }}>

          {/* People to track */}
          <section className="card" style={{ padding: "18px 20px", display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>People to track</h2>
            <ContactTable contacts={company.contacts} />
          </section>

          {/* Company intel — all collapsed into one card */}
          {hasIntel && (
            <div className="inset-card" style={{ padding: "16px 18px", display: "grid", gap: 14 }}>

              {/* Warmer angles */}
              {company.connectionSearches.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 2 }}>Warmer angles</div>
                    <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                      Alumni and shared-background connections.
                    </p>
                  </div>
                  <SuggestedSearches searches={company.connectionSearches} />
                </div>
              )}

              {/* Hiring signals */}
              {(company.atsProviders.length > 0 || company.hiringSignals.length > 0) && (
                <div style={{ display: "grid", gap: 6 }}>
                  <div className="eyebrow">Hiring signals</div>
                  <div className="badges">
                    {company.atsProviders.map((t: string) => <span key={t} className="badge">{t}</span>)}
                    {company.hiringSignals.map((t: string) => <span key={t} className="badge">{t}</span>)}
                  </div>
                </div>
              )}

              {/* Hiring regions */}
              {company.hiringRegions.length > 0 && (
                <div style={{ display: "grid", gap: 4 }}>
                  <div className="eyebrow">Hiring regions</div>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>{company.hiringRegions.join(", ")}</p>
                </div>
              )}

              {/* Cold outreach emails */}
              {emailGuesses.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 2 }}>Cold outreach emails</div>
                    {company.emailPatterns.length > 0 && (
                      <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                        Pattern: {company.emailPatterns.join(", ")}
                      </p>
                    )}
                  </div>
                  <EmailGuesses emails={emailGuesses} />
                </div>
              )}

              {/* Main phone */}
              {company.coldCallPhone && (
                <div style={{ display: "grid", gap: 4 }}>
                  <div className="eyebrow">Main phone</div>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>{company.coldCallPhone}</p>
                </div>
              )}

              {/* Outreach notes */}
              {company.outreachTips && (
                <div style={{ display: "grid", gap: 4 }}>
                  <div className="eyebrow">Outreach notes</div>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>{company.outreachTips}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
