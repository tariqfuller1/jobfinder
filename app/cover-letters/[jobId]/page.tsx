import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverLetterEditor } from "@/components/CoverLetterEditor";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { buildCoverLetter, buildCoverLetterTalkingPoints } from "@/lib/cover-letter";
import { buildResumeFeedback } from "@/lib/resume-feedback";
import { ResumeFeedbackPanel } from "@/components/ResumeFeedbackPanel";
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
  const resumeFeedback = buildResumeFeedback(job, profile);
  const safeCompany = job.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
  const safeTitle = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "role";

  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <section className="card stack compact-stack">
        <div className="space-between">
          <div>
            <h1 className="section-title">Cover letter draft</h1>
            <p className="muted" style={{ margin: 0 }}>
              {job.title} • {job.company} • {job.location ?? "Location not listed"}
            </p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${job.id}`}>Back to job</Link>
            <Link className="button secondary" href={`/resume-feedback/${job.id}`}>Resume tips</Link>
            <Link className="button secondary" href={`/resume-rewrite/${job.id}`}>Rewrite resume</Link>
            {job.primaryApplyUrl ? (
              <a className="button secondary" href={job.primaryApplyUrl} target="_blank" rel="noreferrer">{job.primaryApplyLabel}</a>
            ) : null}
          </div>
        </div>

        <p className="muted">
          This draft is built from the profile saved for {user.displayName || user.email}. Edit it before sending so the final version sounds like you and reflects the exact role.
        </p>
      </section>

      <div className="grid-2">
        <section className="card stack">
          <h2 className="section-title">Editable letter</h2>
          <CoverLetterEditor initialValue={draft} fileName={`${safeCompany}-${safeTitle}-cover-letter.txt`} />
        </section>

        <aside className="card stack compact-stack">
          <div>
            <h2 className="section-title">What this draft is using</h2>
            <div className="badges">
              {talkingPoints.matchedSkills.map((skill) => (<span key={skill} className="badge">{skill}</span>))}
              {talkingPoints.roleHighlights.map((item) => (<span key={item} className="badge">{item}</span>))}
              {talkingPoints.matchedTitles.map((title) => (<span key={title} className="badge">{title}</span>))}
              {talkingPoints.schoolMentions.map((school) => (<span key={school} className="badge">{school}</span>))}
            </div>
          </div>

          <div>
            <h2 className="section-title">How to improve it</h2>
            <div className="stack compact-stack">
              <div className="inset-card">Replace <strong>Hiring Team</strong> with a real recruiter or manager name if you find one.</div>
              <div className="inset-card">Add one concrete result, project, or system you built that best matches this job.</div>
              <div className="inset-card">Cut anything that feels generic so the first two paragraphs stay strong and specific.</div>
            </div>
          </div>

          <ResumeFeedbackPanel feedback={resumeFeedback} compact jobId={job.id} />
        </aside>
      </div>
    </div>
  );
}
