import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverLetterEditor } from "@/components/CoverLetterEditor";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { buildCoverLetter, buildCoverLetterTalkingPoints } from "@/lib/cover-letter";
import { requireCurrentUser } from "@/lib/auth";

export default async function CoverLetterDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const job = await getJobById(jobId, profile);

  if (!job) {
    notFound();
  }

  const talkingPoints = buildCoverLetterTalkingPoints(job, profile);
  const draft = buildCoverLetter(job, profile);
  const safeCompany = job.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
  const safeTitle = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "role";

  return (
    <div style={{ padding: "20px 0 36px", display: "grid", gap: 14 }}>
      <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
        <div className="space-between">
          <div style={{ display: "grid", gap: 3 }}>
            <h1 className="section-title">Cover letter draft</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {job.title} • {job.company} • {job.location ?? "Location not listed"}
            </p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${job.id}`}>Back to job</Link>
            <Link className="button secondary" href={`/ats-check/${job.id}`}>ATS score</Link>
            {job.primaryApplyUrl ? (
              <a className="button secondary" href={job.primaryApplyUrl} target="_blank" rel="noreferrer">{job.primaryApplyLabel}</a>
            ) : null}
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Built from the profile saved for {user.displayName || user.email}. Edit before sending so the final version sounds like you.
        </p>
      </section>

      <div className="grid-2" style={{ gap: 14, alignItems: "start" }}>
        <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
          <h2 className="section-title">Editable letter</h2>
          <CoverLetterEditor
            initialValue={draft}
            fileName={`${safeCompany}-${safeTitle}-cover-letter.txt`}
            type="cover-letter"
            jobTitle={job.title}
            jobCompany={job.company}
            jobDescriptionText={job.descriptionText ?? ""}
            name={profile.name ?? ""}
            email={profile.email ?? ""}
            phone={profile.phone ?? ""}
            summary={profile.summary ?? ""}
            skills={profile.skills ?? []}
            stacks={profile.stacks ?? []}
            workExperience={profile.workExperience ?? []}
            educationEntries={profile.educationEntries ?? []}
            profileLinks={(profile.links ?? []).filter((l) => l.includeInResume !== false)}
          />
        </section>

        <aside style={{ display: "grid", gap: 10 }}>
          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>What this draft uses</h2>
            <div className="badges">
              {talkingPoints.matchedSkills.map((skill) => (<span key={skill} className="badge">{skill}</span>))}
              {talkingPoints.roleHighlights.map((item) => (<span key={item} className="badge">{item}</span>))}
              {talkingPoints.matchedTitles.map((title) => (<span key={title} className="badge">{title}</span>))}
              {talkingPoints.schoolMentions.map((school) => (<span key={school} className="badge">{school}</span>))}
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>How to improve it</h2>
            <div style={{ display: "grid", gap: 6 }}>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>Replace <strong>Hiring Team</strong> with a real recruiter or manager name if you find one.</div>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>Add one concrete result, project, or system you built that best matches this job.</div>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>Cut anything that feels generic so the first two paragraphs stay strong and specific.</div>
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>ATS resume check</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Score your resume against this job's keywords and download an optimized PDF.</p>
            <Link className="button secondary" href={`/ats-check/${job.id}`} style={{ justifyContent: "center", fontSize: 13 }}>
              Run ATS check
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
