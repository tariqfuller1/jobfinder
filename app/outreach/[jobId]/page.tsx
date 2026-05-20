import Link from "next/link";
import { notFound } from "next/navigation";
import { OutreachEditor } from "@/components/OutreachEditor";
import { SuggestedSearches } from "@/components/SuggestedSearches";
import { requireCurrentUser } from "@/lib/auth";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { buildOutreachMessage, suggestContactSearches, suggestConnectionSearches } from "@/lib/recommendations";

export default async function JobOutreachPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const job = await getJobById(jobId, profile);

  if (!job) notFound();

  const tags = job.tags ?? [];

  const contactSearches = suggestContactSearches(
    {
      name: job.company,
      headquarters: job.location,
      companyCategory: job.companyCategory ?? "SOFTWARE",
      roleFocusTags: [],
    },
    profile,
  );

  const connectionSearches = suggestConnectionSearches(
    { name: job.company, headquarters: job.location },
    profile,
  );

  const initialMessage = buildOutreachMessage(
    { companyName: job.company, role: job.title, focusTags: tags },
    profile,
  );

  return (
    <div style={{ padding: "20px 0 48px", display: "grid", gap: 16 }}>

      {/* ── Header ── */}
      <div className="card hero-card" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Company outreach</div>
            <h1 style={{ margin: 0, fontSize: "clamp(1.2rem,2vw,1.6rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Write to {job.company}
            </h1>
            <p className="muted" style={{ margin: "5px 0 0", fontSize: 13 }}>
              {job.title}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            <Link className="button secondary" href={`/jobs/${job.id}`}
              style={{ fontSize: 12, minHeight: 34, padding: "7px 13px" }}>← Back to job</Link>
            <Link className="button secondary" href={`/cover-letters/${job.id}`}
              style={{ fontSize: 12, minHeight: 34, padding: "7px 13px" }}>Cover letter</Link>
            <Link className="button secondary" href={`/ats-check/${job.id}`}
              style={{ fontSize: 12, minHeight: 34, padding: "7px 13px" }}>ATS resume</Link>
            {job.companySlug && (
              <Link className="button secondary" href={`/companies/${job.companySlug}`}
                style={{ fontSize: 12, minHeight: 34, padding: "7px 13px" }}>Company page</Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Main: outreach editor + sidebar ── */}
      <div className="main-sidebar-grid">

        {/* Outreach editor */}
        <div className="card" style={{ padding: "20px 22px", display: "grid", gap: 14 }}>
          <OutreachEditor
            companyName={job.company}
            companyNotes=""
            companyFocus={tags}
            relatedRoles={[job.title]}
            initialMessage={initialMessage}
            name={profile.name ?? ""}
            summary={profile.summary ?? ""}
            skills={profile.skills ?? []}
            stacks={profile.stacks ?? []}
            workExperience={(profile.workExperience ?? []).filter((e) => e.includedInResume !== false)}
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Who to contact */}
          {contactSearches.length > 0 && (
            <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "min(480px, 80vh)", overflow: "hidden" }}>
              <div style={{ flexShrink: 0 }}>
                <div className="eyebrow" style={{ marginBottom: 2 }}>Who to contact</div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  Recruiters and hiring managers at {job.company}.
                </p>
              </div>
              <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                <SuggestedSearches searches={contactSearches} />
              </div>
            </div>
          )}

          {/* Warmer angles */}
          {connectionSearches.length > 0 && (
            <div className="inset-card" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 2 }}>Warmer angles</div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  Alumni and shared-background connections based on your profile.
                </p>
              </div>
              <SuggestedSearches searches={connectionSearches} />
            </div>
          )}

          {/* Tech tags on this role */}
          {tags.length > 0 && (
            <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
              <div className="eyebrow">Role focus areas</div>
              <div className="badges">
                {tags.slice(0, 10).map((tag) => (
                  <span key={tag} className="badge">{tag}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
