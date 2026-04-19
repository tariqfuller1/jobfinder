import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function ResumeRewritePage() {
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const jobs = await listJobs({ page: 1, limit: 12, recommendedOnly: true }, profile);

  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <section className="card hero-card stack compact-stack">
        <h1 className="section-title">Resume rewriter</h1>
        <p className="muted">
          Pick a job and the site will build a full tailored resume draft using the resume and preferences saved to your account profile. It rewrites your headline, summary, skills ordering, experience focus, and tailoring notes in one place.
        </p>
        <div className="badges">
          <span className="badge">Account: {user.displayName || user.email}</span>
          <span className="badge">Profile: {profile.name}</span>
          {profile.skills.slice(0, 6).map((skill) => (
            <span key={skill} className="badge">{skill}</span>
          ))}
        </div>
      </section>

      <section className="card hero-card stack">
        <div className="space-between">
          <div>
            <h2 className="section-title">Choose a job for a tailored resume draft</h2>
            <p className="muted" style={{ margin: 0 }}>
              Start with a high-fit job, then edit the generated draft before you export it.
            </p>
          </div>
          <Link className="button secondary" href="/profile">
            Update profile
          </Link>
        </div>

        {jobs.jobs.length ? jobs.jobs.map((job) => (
          <div key={job.id} className="inset-card stack compact-stack">
            <div className="space-between">
              <div>
                <strong>{job.title}</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {job.company} • {job.location ?? "Location not listed"}
                </p>
              </div>
              <span className="badge badge-accent">Fit {job.fitScore}</span>
            </div>

            <div className="actions">
              <Link className="button" href={`/resume-rewrite/${job.id}`}>
                Rewrite resume
              </Link>
              <Link className="button secondary" href={`/resume-feedback/${job.id}`}>
                Resume tips
              </Link>
              <Link className="button secondary" href={`/cover-letters/${job.id}`}>
                Cover letter
              </Link>
            </div>
          </div>
        )) : (
          <p className="muted">
            No recommended jobs are available yet. Import your resume and sync jobs first so the rewrites have better material to work with.
          </p>
        )}
      </section>
    </div>
  );
}
