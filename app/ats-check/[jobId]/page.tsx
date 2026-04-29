import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { ATSChecker } from "@/components/ATSChecker";

export default async function ATSCheckPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const job = await getJobById(jobId, profile);

  if (!job) notFound();

  const safeCompany = job.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
  const safeTitle = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "role";

  return (
    <div style={{ padding: "20px 0 36px", display: "grid", gap: 14 }}>
      <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
        <div className="space-between">
          <div style={{ display: "grid", gap: 3 }}>
            <h1 className="section-title">ATS score checker</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {job.title} • {job.company} • {job.location ?? "Location not listed"}
            </p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${job.id}`}>Back to job</Link>
            <Link className="button secondary" href={`/cover-letters/${job.id}`}>Cover letter</Link>
            {job.primaryApplyUrl ? (
              <a className="button secondary" href={job.primaryApplyUrl} target="_blank" rel="noreferrer">{job.primaryApplyLabel}</a>
            ) : null}
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Scores your resume against the job description, adds missing ATS keywords, and produces a download-ready PDF — all based on the profile saved for {user.displayName || user.email}.
        </p>
      </section>

      <ATSChecker
        jobTitle={job.title}
        jobCompany={job.company}
        jobDescriptionText={job.descriptionText ?? ""}
        resumeText={profile.resumeText ?? ""}
        workExperience={profile.workExperience}
        projects={profile.projects}
        skills={profile.skills}
        stacks={profile.stacks}
        educationEntries={profile.educationEntries}
        name={profile.name}
        safeFileName={`${safeCompany}-${safeTitle}-resume`}
        profileLinks={profile.links}
      />
    </div>
  );
}
