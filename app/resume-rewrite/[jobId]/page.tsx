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
    <div style={{ padding: "20px 0 36px", display: "grid", gap: 14 }}>
      <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
        <div className="space-between">
          <div style={{ display: "grid", gap: 3 }}>
            <h1 className="section-title">Resume rewrite draft</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {job.title} • {job.company} • {job.location ?? "Location not listed"}
            </p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${job.id}`}>Back to job</Link>
            <Link className="button secondary" href={`/resume-feedback/${job.id}`}>Resume tips</Link>
            <Link className="button secondary" href={`/cover-letters/${job.id}`}>Cover letter</Link>
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Built from the profile saved for {user.displayName || user.email}. Edit before exporting so the final resume uses real metrics, project names, and truthful scope.
        </p>
      </section>

      <div className="grid-2" style={{ gap: 14, alignItems: "start" }}>
        <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
          <h2 className="section-title">Editable resume draft</h2>
          <CoverLetterEditor initialValue={rewrite.draft} fileName={`${safeCompany}-${safeTitle}-resume.txt`} />
        </section>

        <aside style={{ display: "grid", gap: 10 }}>
          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>What this rewrite emphasizes</h2>
            <div className="badges">
              {rewrite.highlights.map((item) => (
                <span key={item} className="badge">{item}</span>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>Before you export</h2>
            <div style={{ display: "grid", gap: 6 }}>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>Replace placeholder bullets with exact project names, shipped work, and measurable outcomes from your background.</div>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>Move your strongest matching project or experience to the top half of the final resume.</div>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>Keep only keywords you can defend in an interview and remove anything that feels inflated.</div>
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px" }}>
            <ResumeFeedbackPanel feedback={rewrite.feedback} compact jobId={job.id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
