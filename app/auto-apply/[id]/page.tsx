import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attachResume, getAutoApplyForUser, getAutoApplySettings } from "@/lib/auto-apply/service";
import { AutoApplyReview } from "@/components/AutoApplyReview";
import { AutoApplyStatusBadge } from "@/components/AutoApplyStatusBadge";

const ATS_NAME: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

export default async function AutoApplyReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const [autoApply, settings] = await Promise.all([getAutoApplyForUser(user.id, id), getAutoApplySettings(user.id)]);
  if (!autoApply) notFound();

  const hasScreenshot =
    autoApply.status === "SUBMITTED" &&
    (await prisma.autoApply.count({ where: { id, screenshot: { not: null } } })) > 0;
  const fields =
    autoApply.status === "NEEDS_REVIEW" ? attachResume(autoApply.fields, settings.hasResume) : autoApply.fields;

  return (
    <div style={{ padding: "20px 0 36px", display: "grid", gap: 14, maxWidth: 820 }}>
      <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
        <div className="space-between">
          <div style={{ display: "grid", gap: 3 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h1 className="section-title">Auto-apply</h1>
              <AutoApplyStatusBadge status={autoApply.status} />
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {autoApply.job.title} · {autoApply.job.company}
              {autoApply.job.location ? ` · ${autoApply.job.location}` : ""} · via {ATS_NAME[autoApply.ats] ?? autoApply.ats}
            </p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${autoApply.job.id}`}>Back to job</Link>
            <Link className="button secondary" href="/auto-apply">All auto-applies</Link>
          </div>
        </div>
      </section>

      <AutoApplyReview
        id={autoApply.id}
        jobId={autoApply.job.id}
        status={autoApply.status}
        formUrl={autoApply.formUrl}
        error={autoApply.error}
        fields={fields}
        resumeFileName={settings.resumeFileName}
        hasScreenshot={hasScreenshot}
      />
    </div>
  );
}
