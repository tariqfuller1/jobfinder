import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireCurrentUser } from "@/lib/auth";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { getAutoApplySettings, listAutoAppliesForUser, submissionsEnabled } from "@/lib/auto-apply/service";
import { AutoApplySettingsForm } from "@/components/AutoApplySettingsForm";
import { AutoApplyStatusBadge } from "@/components/AutoApplyStatusBadge";
import { ResumeFileUpload } from "@/components/ResumeFileUpload";

export default async function AutoApplyPage() {
  const user = await requireCurrentUser();
  const [profile, settings, applies] = await Promise.all([
    getProfileForUserOrDefault(user.id),
    getAutoApplySettings(user.id),
    listAutoAppliesForUser(user.id),
  ]);

  const [city, state] = (profile.location ?? "").split(",").map((s) => s.trim());
  const latestJob = profile.workExperience[0];
  const placeholders = {
    phone: profile.phone,
    city,
    state,
    currentCompany: latestJob?.company,
    currentTitle: latestJob?.title,
    linkedinUrl: profile.links.find((l) => /linkedin/i.test(l.url))?.url,
    githubUrl: profile.links.find((l) => /github/i.test(l.url))?.url,
    portfolioUrl: profile.links.find((l) => !/linkedin|github/i.test(l.url))?.url,
  };

  const needsSetup = !settings.hasResume || !settings.answers.workAuthorizedUS || !settings.answers.requiresSponsorship;

  return (
    <div style={{ padding: "20px 0 36px", display: "grid", gap: 14 }}>
      <section className="card hero-card" style={{ display: "grid", gap: 8, padding: "18px 20px" }}>
        <h1 className="section-title">Auto-apply</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Hit <strong>Auto-apply</strong> on any Greenhouse, Lever, or Ashby job. Hyrd reads the real application form, fills it in
          from your profile and the answers below, writes the open-ended questions with AI, and submits it — or stops for you
          to check first, depending on the setting below. Anything only you can answer always comes back to you.
        </p>
        {!submissionsEnabled() && (
          <p style={{ margin: 0, fontSize: 13, color: "#fbbf24" }}>
            Automatic submission isn't switched on for this site yet — Hyrd will fill applications in for you to copy into the form.
          </p>
        )}
        {needsSetup && (
          <p style={{ margin: 0, fontSize: 13, color: "#fbbf24" }}>
            Finish setup first: {[
              !settings.hasResume && "upload your resume file",
              !settings.answers.workAuthorizedUS && "answer work authorization",
              !settings.answers.requiresSponsorship && "answer sponsorship",
            ].filter(Boolean).join(", ")}.
          </p>
        )}
      </section>

      <div className="grid-2" style={{ gap: 14, alignItems: "start" }}>
        <section className="card" style={{ padding: "16px 18px", display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "1rem" }}>Resume file</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Attached to every application. Importing a PDF or DOCX on your <Link href="/profile" style={{ textDecoration: "underline" }}>profile</Link> also saves it here.
            </p>
            <ResumeFileUpload fileName={settings.resumeFileName} />
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, display: "grid", gap: 8 }}>
            <h2 className="section-title" style={{ fontSize: "1rem" }}>Your standard answers</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Answer these once. Name, email, and work history come from your profile.
            </p>
          </div>
          <AutoApplySettingsForm initial={settings.answers} placeholders={placeholders} />
        </section>

        <section className="card" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
          <h2 className="section-title" style={{ fontSize: "1rem" }}>Your auto-applies</h2>
          {applies.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Nothing yet. Open a job from the <Link href="/jobs" style={{ textDecoration: "underline" }}>jobs board</Link> and hit Auto-apply.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {applies.map((a) => (
                <Link
                  key={a.id}
                  href={`/auto-apply/${a.id}`}
                  className="inset-card"
                  style={{ padding: "10px 12px", display: "grid", gap: 4 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <strong style={{ fontSize: 14 }}>{a.job.title}</strong>
                    <AutoApplyStatusBadge status={a.status} />
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {a.job.company} · {formatDistanceToNow(a.updatedAt, { addSuffix: true })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
