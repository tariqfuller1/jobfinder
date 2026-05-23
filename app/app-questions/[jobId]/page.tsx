import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { getJobById } from "@/lib/jobs";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { AppQuestionEditor } from "@/components/AppQuestionEditor";

function getMatchedSkills(
  profileSkills: string[],
  profileStacks: string[],
  jobTags: string[],
  jobDescriptionText: string,
): string[] {
  const jobText = [jobDescriptionText, ...jobTags].join(" ").toLowerCase();
  const all = [...profileSkills, ...profileStacks];
  const seen = new Set<string>();
  return all.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return jobText.includes(key);
  });
}

function buildSuggestedQuestions(
  jobTitle: string,
  company: string,
  tags: string[],
  descriptionText: string,
): string[] {
  const questions: string[] = [
    `Why do you want to work at ${company}?`,
    "Tell us about yourself.",
    "What is your greatest professional strength?",
    "Describe a challenging project you led or contributed to.",
    "Why are you interested in this role?",
    "Where do you see yourself in 3–5 years?",
    "How do you handle working under pressure or tight deadlines?",
  ];

  // Add tech-specific questions from job tags
  const techTags = tags.slice(0, 3);
  for (const tag of techTags) {
    questions.push(`Describe your experience with ${tag}.`);
  }

  // Seniority-aware questions
  const titleLower = jobTitle.toLowerCase();
  if (titleLower.includes("senior") || titleLower.includes("lead") || titleLower.includes("staff")) {
    questions.push("Describe your experience mentoring or leading other engineers.");
    questions.push("Tell us about a time you influenced a major technical decision.");
  }
  if (titleLower.includes("manager") || titleLower.includes("director")) {
    questions.push("How do you manage and grow an engineering team?");
  }
  if (titleLower.includes("intern") || titleLower.includes("junior") || titleLower.includes("entry")) {
    questions.push("What project from school or a personal project are you most proud of?");
    questions.push("How do you approach learning new technologies?");
  }

  // Description-based signal
  const desc = descriptionText.toLowerCase();
  if (desc.includes("collaborat") || desc.includes("cross-functional")) {
    questions.push("Give an example of working effectively across teams.");
  }
  if (desc.includes("scalab") || desc.includes("performance")) {
    questions.push("Describe a time you improved the performance or scalability of a system.");
  }
  if (desc.includes("agile") || desc.includes("scrum")) {
    questions.push("How do you work within an agile or scrum process?");
  }

  // Deduplicate and cap
  return Array.from(new Set(questions)).slice(0, 10);
}

export default async function AppQuestionsJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);
  const job = await getJobById(jobId, profile);

  if (!job) notFound();

  const workExperience = (profile.workExperience ?? []).filter((e) => e.includedInResume !== false);
  const projects = (profile.projects ?? []).filter((p) => p.includedInResume !== false);
  const matchedSkills = getMatchedSkills(
    profile.skills ?? [],
    profile.stacks ?? [],
    job.tags ?? [],
    job.descriptionText ?? "",
  );
  const suggestedQuestions = buildSuggestedQuestions(
    job.title,
    job.company,
    job.tags ?? [],
    job.descriptionText ?? "",
  );

  return (
    <div style={{ padding: "20px 0 36px", display: "grid", gap: 14 }}>

      <section className="card" style={{ display: "grid", gap: 10, padding: "16px 18px" }}>
        <div className="space-between">
          <div style={{ display: "grid", gap: 3 }}>
            <h1 className="section-title">Application questions</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {job.title} · {job.company} · {job.location ?? "Location not listed"}
            </p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/jobs/${job.id}`}>Back to job</Link>
            <Link className="button secondary" href={`/cover-letters/${job.id}`}>Cover letter</Link>
            <Link className="button secondary" href={`/ats-check/${job.id}`}>ATS score</Link>
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Pick a question below or type your own. AI will answer using your profile and this job's description — edit freely and refine until it sounds like you.
        </p>
      </section>

      <div className="grid-2" style={{ gap: 14, alignItems: "start" }}>

        <section className="card" style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
          <h2 className="section-title">Question &amp; answer</h2>
          <AppQuestionEditor
            jobTitle={job.title}
            jobCompany={job.company}
            jobDescriptionText={job.descriptionText ?? ""}
            name={profile.name ?? ""}
            headline={profile.headline ?? ""}
            summary={profile.summary ?? ""}
            skills={profile.skills ?? []}
            stacks={profile.stacks ?? []}
            workExperience={workExperience}
            projects={projects}
            educationEntries={profile.educationEntries ?? []}
            suggestedQuestions={suggestedQuestions}
          />
        </section>

        <aside style={{ display: "grid", gap: 10 }}>

          {/* Matched skills — mirrors "What this draft uses" in cover letter */}
          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>What the AI will draw on</h2>
            {matchedSkills.length > 0 ? (
              <>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  Skills from your profile that match this job — the AI will reference these in every answer.
                </p>
                <div className="badges">
                  {matchedSkills.map((s) => (
                    <span key={s} className="badge">{s}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                No direct skill matches found. The AI will still use your summary and work experience.
                Add skills to your profile to improve targeting.
              </p>
            )}
            {workExperience.length > 0 && (
              <div style={{ marginTop: 4, display: "grid", gap: 4 }}>
                {workExperience.slice(0, 2).map((e, i) => (
                  <div key={i} className="inset-card" style={{ padding: "7px 10px", fontSize: 12, color: "#9ca3af" }}>
                    {e.title} · {e.company}
                  </div>
                ))}
                {projects.slice(0, 2).map((p, i) => (
                  <div key={i} className="inset-card" style={{ padding: "7px 10px", fontSize: 12, color: "#9ca3af" }}>
                    Project: {p.name}{p.technologies?.length ? ` · ${p.technologies.slice(0, 3).join(", ")}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>Tips</h2>
            <div style={{ display: "grid", gap: 6 }}>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>
                Be specific — mention real projects, technologies, or results from your experience.
              </div>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>
                Aim for 150–250 words. Use Refine to shorten, formalize, or shift emphasis.
              </div>
              <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>
                Read it out loud before submitting — if it doesn't sound like you, edit it.
              </div>
            </div>
          </div>

          {/* Other tools */}
          <div className="card" style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "0.95rem" }}>More tools for this job</h2>
            <Link className="button secondary" href={`/cover-letters/${job.id}`} style={{ justifyContent: "flex-start", fontSize: 13, gap: 10 }}>
              <span style={{ opacity: 0.7 }}>✦</span> Cover letter
            </Link>
            <Link className="button secondary" href={`/ats-check/${job.id}`} style={{ justifyContent: "flex-start", fontSize: 13, gap: 10 }}>
              <span style={{ opacity: 0.7 }}>✦</span> ATS score &amp; resume
            </Link>
            <Link className="button secondary" href={`/outreach/${job.id}`} style={{ justifyContent: "flex-start", fontSize: 13, gap: 10 }}>
              <span style={{ opacity: 0.7 }}>✦</span> Outreach message
            </Link>
          </div>

        </aside>
      </div>
    </div>
  );
}
