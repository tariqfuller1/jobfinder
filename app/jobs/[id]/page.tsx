import Link from "next/link";
import { ApplyButton } from "@/components/ApplyButton";
import { JobDetailEditor } from "@/components/JobDetailEditor";
import { SuggestedSearches } from "@/components/SuggestedSearches";
import { getCurrentUser } from "@/lib/auth";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { suggestConnectionSearches } from "@/lib/recommendations";
import { getRoleCategory } from "@/lib/classify";
import { sanitizeJobHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/normalize";
import { notFound } from "next/navigation";

function fmtWorkplace(v: string) {
  if (v === "REMOTE") return "Remote";
  if (v === "HYBRID") return "Hybrid";
  if (v === "ONSITE") return "On-site";
  return null;
}

function fmtEmployment(v: string) {
  if (v === "FULL_TIME") return "Full-time";
  if (v === "PART_TIME") return "Part-time";
  if (v === "INTERNSHIP") return "Internship";
  if (v === "CONTRACT") return "Contract";
  if (v === "TEMPORARY") return "Temporary";
  return null;
}

function fmtExperience(v: string) {
  if (v === "INTERN") return "Intern";
  if (v === "ENTRY") return "Entry-level";
  if (v === "MID") return "Mid-level";
  if (v === "SENIOR") return "Senior";
  if (v === "LEAD") return "Lead / Manager";
  return null;
}

function fmtSource(v: string) {
  const base = v.split(":")[0];
  return base.charAt(0).toUpperCase() + base.slice(1).replace(/-/g, " ");
}

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const profile = user ? await getProfileForUserOrDefault(user.id) : null;
  const job = await getJobById(id, profile);

  if (!job) notFound();

  const connectionSearches = suggestConnectionSearches(
    { name: job.company, headquarters: job.location ?? undefined },
    profile ?? undefined,
  );

  const workplace = fmtWorkplace(job.workplaceType);
  const employment = fmtEmployment(job.employmentType);
  const experience = fmtExperience(job.experienceLevel);
  const source = fmtSource(job.source);
  const isGaming = job.companyCategory === "GAMING" || job.companyCategory === "BOTH";
  const rolecat = getRoleCategory(job.roleCategory ?? "software");

  const fitHigh = job.fitScore >= 60;
  const fitMid = job.fitScore >= 30;
  const fitColor = fitHigh ? "#4ade80" : fitMid ? "#fbbf24" : "#6b7280";
  const fitBg = fitHigh
    ? "linear-gradient(135deg, rgba(74,222,128,0.18), rgba(34,197,94,0.1))"
    : fitMid
      ? "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))"
      : "rgba(255,255,255,0.05)";
  const fitBorder = fitHigh
    ? "1px solid rgba(74,222,128,0.28)"
    : fitMid
      ? "1px solid rgba(251,191,36,0.24)"
      : "1px solid rgba(255,255,255,0.09)";

  return (
    <div style={{ padding: "20px 0 52px" }}>

      {/* Back link */}
      <Link
        href="/jobs"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", marginBottom: 20 }}
      >
        ← All jobs
      </Link>

      <div className="grid-2" style={{ alignItems: "start", gap: 20 }}>

        {/* ── LEFT: Main content ── */}
        <div style={{ display: "grid", gap: 18, minWidth: 0 }}>

          {/* Header card */}
          <div className="card hero-card" style={{ padding: "20px 22px 18px" }}>

            {/* Role category + company row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              {/* Role category chip */}
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                padding: "3px 11px", borderRadius: 999,
                color: rolecat.color, background: rolecat.bg, border: `1px solid ${rolecat.border}`,
              }}>
                {rolecat.label}
              </span>
              {/* Company */}
              {job.companySlug ? (
                <Link href={`/companies/${job.companySlug}`} style={{ color: "#ff3368", fontWeight: 700, fontSize: 14 }}>
                  {job.company}
                </Link>
              ) : (
                <span style={{ color: "#d4d4d8", fontWeight: 700, fontSize: 14 }}>{job.company}</span>
              )}
              {job.location && <span style={{ color: "#6b7280", fontSize: 13 }}>· {job.location}</span>}
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: "clamp(1.55rem, 2.5vw, 2.2rem)",
              fontWeight: 800, letterSpacing: "-0.035em",
              lineHeight: 1.1, margin: "0 0 14px", color: "#f5f5f5",
            }}>
              {job.title}
            </h1>

            {/* Meta badges */}
            <div className="badges" style={{ marginBottom: 14 }}>
              {workplace && <span className="badge">{workplace}</span>}
              {employment && <span className="badge">{employment}</span>}
              {experience && <span className="badge">{experience}</span>}
              <span className="badge" style={{ color: "#9b9ba8" }}>{source}</span>
              {isGaming && <span className="badge badge-accent">Gaming</span>}
              {job.primaryApplyUrl && (
                <span className="badge" style={{ color: "#4ade80", borderColor: "rgba(74,222,128,0.22)", background: "rgba(74,222,128,0.06)" }}>
                  Direct apply
                </span>
              )}
            </div>

            {/* Tech tags */}
            {job.tags && job.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {job.tags.slice(0, 12).map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px",
                    borderRadius: 6, border: "1px solid rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.04)", color: "#a1a1aa",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Fit score + reasons */}
            {job.fitScore > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 13px", borderRadius: 999,
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                  background: fitBg, border: fitBorder, color: fitColor,
                }}>
                  <span style={{ fontSize: 8 }}>●</span>
                  Fit {job.fitScore}
                </span>
                {job.fitReasons.map((reason) => (
                  <span key={reason} style={{
                    fontSize: 12, color: "#a1a1aa",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 999, padding: "4px 11px",
                  }}>
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description card */}
          <div className="card" style={{ padding: "18px 22px" }}>
            {job.descriptionHtml ? (
              <div className="job-body" dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(job.descriptionHtml) }} />
            ) : job.descriptionText ? (
              <div className="job-body">
                {(stripHtml(job.descriptionText) ?? "").split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para.trim()}</p>
                ))}
              </div>
            ) : (
              <p className="muted">Open the original posting to read the full description.</p>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <aside style={{ display: "grid", gap: 14 }}>

          {/* Apply */}
          <div className="card" style={{
            padding: "20px 20px 18px",
            background: "linear-gradient(160deg, rgba(28,14,18,0.98), rgba(14,8,10,0.99))",
            borderColor: "rgba(255,46,99,0.22)",
          }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Apply for this role</div>
            <ApplyButton
              applyUrl={job.primaryApplyUrl ?? job.applyUrl ?? job.sourceUrl}
              jobId={job.id}
              requireLogin={!user}
            />
            {(job.companyCareersUrl || job.companyWebsiteUrl || job.sourceUrl) && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {job.companyCareersUrl && (
                  <a className="button secondary" href={job.companyCareersUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, minHeight: 36, flex: 1, justifyContent: "center" }}>
                    Careers page
                  </a>
                )}
                {job.companyWebsiteUrl && (
                  <a className="button secondary" href={job.companyWebsiteUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, minHeight: 36, flex: 1, justifyContent: "center" }}>
                    Company site
                  </a>
                )}
                {job.sourceUrl && (
                  <a className="button secondary" href={job.sourceUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, minHeight: 36, flex: 1, justifyContent: "center" }}>
                    Original listing
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Salary estimate */}
          {job.salary && (
            <div className="inset-card" style={{
              borderColor: "rgba(251,191,36,0.18)",
              background: "linear-gradient(160deg, rgba(28,22,6,0.96), rgba(14,11,3,0.99))",
              padding: "16px 18px",
              display: "grid",
              gap: 6,
            }}>
              <div className="eyebrow" style={{ color: "#9e8634" }}>Salary estimate</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#fbbf24", lineHeight: 1.2 }}>
                {job.salary.label}
              </div>
              <div style={{ fontSize: 12, color: "#6b6b72" }}>Based on: {job.salary.basis}</div>
            </div>
          )}

          {/* AI tools */}
          <div className="inset-card" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div className="eyebrow">AI-powered tools</div>
            <div style={{ display: "grid", gap: 6 }}>
              <Link
                className="button secondary"
                href={user ? `/cover-letters/${job.id}` : `/login?next=/cover-letters/${job.id}`}
                style={{ justifyContent: "flex-start", fontSize: 13, gap: 10 }}
              >
                <span style={{ opacity: 0.7 }}>✦</span> Cover letter
              </Link>
              <Link
                className="button secondary"
                href={user ? `/ats-check/${job.id}` : `/login?next=/ats-check/${job.id}`}
                style={{ justifyContent: "flex-start", fontSize: 13, gap: 10 }}
              >
                <span style={{ opacity: 0.7 }}>✦</span> ATS score &amp; resume
              </Link>
              <Link
                className="button secondary"
                href={user ? `/outreach/${job.id}` : `/login?next=/outreach/${job.id}`}
                style={{ justifyContent: "flex-start", fontSize: 13, gap: 10 }}
              >
                <span style={{ opacity: 0.7 }}>✦</span> Outreach message
              </Link>
            </div>
          </div>

          {/* Sign-in CTA for logged-out users */}
          {!user && (
            <div className="inset-card" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
              <div className="eyebrow">Personalized help</div>
              <strong style={{ fontSize: 15 }}>Sign in for AI tools</strong>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Save your resume and get an ATS score, optimized resume, and cover letter tailored to this job.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Link className="button secondary" href={`/login?next=/jobs/${job.id}`} style={{ flex: 1, justifyContent: "center", fontSize: 13 }}>Sign in</Link>
                <Link className="button" href={`/register?next=/jobs/${job.id}`} style={{ flex: 1, justifyContent: "center", fontSize: 13 }}>Create account</Link>
              </div>
            </div>
          )}

          {/* Network / connection searches */}
          <div className="inset-card" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div className="eyebrow">People who may help</div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Alumni, recruiters, and shared-background connections at {job.company}.
            </p>
            <SuggestedSearches searches={connectionSearches} />
          </div>

          {/* Edit job metadata */}
          <div className="inset-card" style={{ padding: "16px 18px" }}>
            <JobDetailEditor
              jobId={job.id}
              workplaceType={job.workplaceType}
              employmentType={job.employmentType}
              experienceLevel={job.experienceLevel}
              location={job.location}
            />
          </div>

        </aside>
      </div>
    </div>
  );
}
