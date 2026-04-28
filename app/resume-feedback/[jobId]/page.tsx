import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumeFeedbackPanel } from "@/components/ResumeFeedbackPanel";
import { requireCurrentUser } from "@/lib/auth";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { buildResumeFeedback } from "@/lib/resume-feedback";

export default async function ResumeFeedbackDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const job = await getJobById(jobId, profile);

  if (!job) {
    notFound();
  }

  const feedback = buildResumeFeedback(job, profile);

  return (
    <div style={{ padding: "20px 0 36px", display: "grid", gap: 14 }}>
      <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
        <div className="space-between">
          <div style={{ display: "grid", gap: 3 }}>
            <h1 className="section-title">Resume tips for this job</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>{job.title} • {job.company} • {job.location ?? "Location not listed"}</p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${job.id}`}>Back to job</Link>
            <Link className="button secondary" href={`/resume-rewrite/${job.id}`}>Rewrite resume</Link>
            <Link className="button secondary" href={`/cover-letters/${job.id}`}>Cover letter</Link>
            {job.primaryApplyUrl ? (
              <a className="button secondary" href={job.primaryApplyUrl} target="_blank" rel="noreferrer">{job.primaryApplyLabel}</a>
            ) : null}
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Tailor your resume before you apply. Advice is based on the overlap and gaps between this job and the profile saved to your account.
        </p>
      </section>

      <section className="card" style={{ padding: "16px 18px" }}>
        <ResumeFeedbackPanel feedback={feedback} />
      </section>
    </div>
  );
}
