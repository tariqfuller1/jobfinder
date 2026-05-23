import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";

export default async function AppQuestionsPage() {
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const jobs = await listJobs({ page: 1, limit: 12, recommendedOnly: true }, profile);

  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <section className="card hero-card stack compact-stack">
        <h1 className="section-title">Application questions</h1>
        <p className="muted">
          Paste any question from a job application and get a tailored answer built from your profile. Works for short prompts like "Why do you want to work here?" and longer essay questions alike. Edit the draft, then refine with AI until it sounds like you.
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
            <h2 className="section-title">Choose a job to get started</h2>
            <p className="muted" style={{ margin: 0 }}>
              Your top matches are shown below. You can also open any job and access this tool from the AI tools panel.
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
                    {job.company} · {job.location ?? "Location not listed"}
                  </p>
                </div>
                <span className="badge badge-accent">Fit {job.fitScore}</span>
              </div>
              <div className="actions">
                <Link className="button" href={`/app-questions/${job.id}`}>Answer questions</Link>
                <Link className="button secondary" href={`/cover-letters/${job.id}`}>Cover letter</Link>
                <Link className="button secondary" href={`/jobs/${job.id}`}>View job</Link>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            No recommended jobs yet. Import your resume on the profile page and wait for the next job sync.
          </p>
        )}
      </section>
    </div>
  );
}
