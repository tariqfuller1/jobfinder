import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function ATSCheckPage() {
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const jobs = await listJobs({ page: 1, limit: 12, recommendedOnly: true }, profile);

  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <section className="card hero-card stack compact-stack">
        <h1 className="section-title">ATS resume checker</h1>
        <p className="muted">
          Score your resume against a job description, see which keywords you are missing, and download a tailored ATS-optimized PDF. Pick a job below to get started.
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
            <h2 className="section-title">Choose a job to check your resume</h2>
            <p className="muted" style={{ margin: 0 }}>
              These are your strongest current matches. You can also open any job detail page and run the ATS check from there.
            </p>
          </div>
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
                <Link className="button" href={`/ats-check/${job.id}`}>Run ATS check</Link>
                <Link className="button secondary" href={`/cover-letters/${job.id}`}>Cover letter</Link>
                <Link className="button secondary" href={`/jobs/${job.id}`}>View job</Link>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            No recommended jobs are available yet. Import your resume on the profile page and run a job sync to improve your matches.
          </p>
        )}
      </section>
    </div>
  );
}
