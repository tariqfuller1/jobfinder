import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function CoverLettersPage() {
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const jobs = await listJobs({ page: 1, limit: 12, recommendedOnly: true }, profile);

  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <section className="card hero-card stack compact-stack">
        <h1 className="section-title">Cover letter maker</h1>
        <p className="muted">
          Generate a tailored draft for a specific job using the resume and preferences saved to your account. The letter pulls from your profile summary, skills, schools, and target roles so you are not starting from a blank page.
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
            <h2 className="section-title">Choose a job to generate a draft</h2>
            <p className="muted" style={{ margin: 0 }}>
              These are your strongest current matches. You can also open any job detail page and create a cover letter from there.
            </p>
          </div>
          <Link className="button secondary" href="/resume-rewrite">
            Resume rewriter
          </Link>
        </div>

        {jobs.jobs.length ? (
          jobs.jobs.map((job) => (
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
                <Link className="button" href={`/cover-letters/${job.id}`}>Make cover letter</Link>
                <Link className="button secondary" href={`/resume-feedback/${job.id}`}>Resume tips</Link>
                <Link className="button secondary" href={`/resume-rewrite/${job.id}`}>Rewrite resume</Link>
                <Link className="button secondary" href={`/jobs/${job.id}`}>View job</Link>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            No recommended jobs are available yet. Import your resume on the profile page and run a job sync to improve the drafts.
          </p>
        )}
      </section>
    </div>
  );
}
