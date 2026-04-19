import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverLetterEditor } from "@/components/CoverLetterEditor";
import { ResumeFeedbackPanel } from "@/components/ResumeFeedbackPanel";
import { requireCurrentUser } from "@/lib/auth";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { buildResumeRewrite } from "@/lib/resume-rewriter";

export default async function ResumeRewriteDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const job = await getJobById(jobId, profile);

  if (!job) {
    notFound();
  }

  const rewrite = buildResumeRewrite(job, profile);
  const safeCompany = job.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
  const safeTitle = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "role";

  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <section className="card stack compact-stack">
        <div className="space-between">
          <div>
            <h1 className="section-title">Resume rewrite draft</h1>
            <p className="muted" style={{ margin: 0 }}>
              {job.title} • {job.company} • {job.location ?? "Location not listed"}
            </p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${job.id}`}>
              Back to job
            </Link>
            <Link className="button secondary" href={`/resume-feedback/${job.id}`}>
              Resume tips
            </Link>
            <Link className="button secondary" href={`/cover-letters/${job.id}`}>
              Cover letter
            </Link>
          </div>
        </div>
        <p className="muted">
          This draft uses the account profile saved for {user.displayName || user.email}. Edit it before exporting so the final resume uses real metrics, specific project names, and truthful scope.
        </p>
      </section>

      <div className="grid-2">
        <section className="card stack">
          <h2 className="section-title">Editable resume draft</h2>
          <CoverLetterEditor initialValue={rewrite.draft} fileName={`${safeCompany}-${safeTitle}-resume.txt`} />
        </section>

        <aside className="card stack compact-stack">
          <div>
            <h2 className="section-title">What this rewrite is emphasizing</h2>
            <div className="badges">
              {rewrite.highlights.map((item) => (
                <span key={item} className="badge">{item}</span>
              ))}
            </div>
          </div>

          <ResumeFeedbackPanel feedback={rewrite.feedback} compact jobId={job.id} />

          <div>
            <h2 className="section-title">Before you export</h2>
            <div className="stack compact-stack">
              <div className="inset-card">Replace the placeholder bullets with the exact project names, shipped work, and measurable outcomes from your background.</div>
              <div className="inset-card">Move your strongest matching project or experience entry to the top half of the final resume.</div>
              <div className="inset-card">Keep only keywords you can defend in an interview and remove anything that feels inflated.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
