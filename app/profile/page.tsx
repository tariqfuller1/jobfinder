import { ResumeImportForm } from "@/components/ResumeImportForm";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { LinksEditor } from "@/components/LinksEditor";
import { WorkExperienceEditor } from "@/components/WorkExperienceEditor";
import { ProjectsEditor } from "@/components/ProjectsEditor";
import { requireCurrentUser } from "@/lib/auth";
import { getProfileForUserOrDefault } from "@/lib/profile";
import { buildGoogleSearchUrl, buildLinkedInSearchUrl } from "@/lib/recommendations";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const profile = await getProfileForUserOrDefault(user.id);

  const quickSearches = profile.schoolKeywords.slice(0, 4).map((keyword) => {
    const query = `${keyword} software engineer recruiter`;
    return {
      label: keyword,
      query,
      linkedinUrl: buildLinkedInSearchUrl(query),
      googleUrl: buildGoogleSearchUrl(`${query} LinkedIn`),
    };
  });

  const isNewUser = !profile.resumeText && profile.skills.length === 0;

  return (
    <div className="stack page-stack-lg" style={{ padding: "24px 0 40px" }}>

      {/* Welcome banner for brand-new users with no resume yet */}
      {isNewUser && (
        <div style={{
          background: "linear-gradient(135deg, rgba(255,51,104,0.12), rgba(255,51,104,0.05))",
          border: "1px solid rgba(255,51,104,0.28)",
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <span style={{ fontSize: 22 }}>👋</span>
          <div>
            <strong style={{ color: "#f5f5f5", display: "block", marginBottom: 4 }}>
              Welcome to Hyrd — let&apos;s set up your profile
            </strong>
            <span className="muted" style={{ fontSize: 13 }}>
              Upload your resume below and we&apos;ll auto-fill your skills, experience, and job preferences.
              That unlocks personalized job matches, ATS scoring, and AI cover letters.
            </span>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero-grid card hero-card">
        <div className="stack compact-stack hero-copy">
          <div className="eyebrow">Account workspace</div>
          <h1 className="section-title">Your saved profile powers the whole site</h1>
          <p className="muted hero-lead">
            Signed in as {user.displayName || user.email}. Your resume, work history, and preferences live here and feed every ATS resume, cover letter, and job match.
          </p>
        </div>
        <div className="hero-panel stack compact-stack">
          <div className="metric-grid metric-grid-tight">
            <div className="metric-card inset-card">
              <div className="metric-label">Skills saved</div>
              <div className="metric-value">{profile.skills.length}</div>
              <div className="metric-note">Used in matching</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Jobs tracked</div>
              <div className="metric-value">{profile.workExperience.length}</div>
              <div className="metric-note">Work experience entries</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Projects</div>
              <div className="metric-value">{profile.projects.length}</div>
              <div className="metric-note">In your portfolio</div>
            </div>
          </div>
        </div>
      </section>

      {/* Resume import + profile snapshot */}
      <section className="grid-2">
        <section className="card hero-card stack">
          <div>
            <div className="eyebrow">Resume source of truth</div>
            <h2 className="section-title">Import or replace your resume</h2>
            <p className="muted">
              Upload your resume and the app automatically extracts your work experience, projects, skills, and connection angles. Everything populates below — review and edit after importing.
            </p>
          </div>
          <ResumeImportForm />
        </section>

        <article className="card stack compact-stack">
          <h2 className="section-title">Saved profile snapshot</h2>
          <div className="inset-card stack compact-stack">
            <strong>{profile.name}</strong>
            <p className="muted" style={{ margin: 0 }}>{profile.headline}</p>
            <p className="muted" style={{ margin: 0 }}>{profile.location ?? "Location not set yet"}</p>
            <p className="muted" style={{ margin: 0 }}>{profile.summary}</p>
          </div>

          <div>
            <h3 className="section-title" style={{ marginBottom: 8 }}>Preferred locations</h3>
            <div className="badges">
              {profile.preferredLocations.map((entry) => (
                <span key={entry} className="badge">{entry}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="section-title" style={{ marginBottom: 8 }}>Skills</h3>
            <div className="badges">
              {profile.skills.slice(0, 20).map((skill) => (
                <span key={skill} className="badge">{skill}</span>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* Links */}
      <section className="card stack">
        <div>
          <div className="eyebrow">Quick access</div>
          <h2 className="section-title">Your links</h2>
          <p className="muted">
            Save your LinkedIn, GitHub, portfolio, and any other links here. They appear on your dashboard for one-click access.
          </p>
        </div>
        <LinksEditor initialLinks={profile.links} />
      </section>

      {/* Profile settings */}
      <section className="card stack">
        <div>
          <div className="eyebrow">Preference tuning</div>
          <h2 className="section-title">Edit profile settings</h2>
          <p className="muted">
            Set your location preferences, job targets, and keywords here. These shape which roles are recommended and how cover letters are written.
          </p>
        </div>
        <ProfileSettingsForm profile={profile} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Work history</div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Work experience</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            Automatically populated when you import a resume. You can also add or edit entries manually.
          </p>
          <WorkExperienceEditor initialEntries={profile.workExperience} resumeText={profile.resumeText} />
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Portfolio</div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Projects</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            Automatically extracted from your resume. Add or edit projects here — they're included in every ATS-optimized resume.
          </p>
          <ProjectsEditor initialProjects={profile.projects} resumeText={profile.resumeText} />
        </div>
      </section>

      {/* Connection angles */}
      <section className="grid-2">
        <article className="card stack compact-stack">
          <h2 className="section-title">Connection angles</h2>
          <p className="muted">
            These searches turn your saved background into warm-intro angles for company pages and outreach.
          </p>
          <div>
            <h3 className="section-title" style={{ marginBottom: 8 }}>Schools and alumni</h3>
            <div className="badges">
              {profile.schoolKeywords.map((keyword) => (
                <span key={keyword} className="badge">{keyword}</span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="section-title" style={{ marginBottom: 8 }}>Past companies</h3>
            <div className="badges">
              {profile.companiesWorked.map((entry) => (
                <span key={entry} className="badge">{entry}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="card stack compact-stack">
          <h2 className="section-title">Quick search launcher</h2>
          <div className="stack compact-stack">
            {quickSearches.length ? quickSearches.map((search) => (
              <div key={search.query} className="inset-card stack compact-stack">
                <strong>{search.label}</strong>
                <p className="muted" style={{ margin: 0 }}>{search.query}</p>
                <div className="actions">
                  <a className="button secondary" href={search.linkedinUrl} target="_blank" rel="noreferrer">Search LinkedIn</a>
                  <a className="button secondary" href={search.googleUrl} target="_blank" rel="noreferrer">Search web</a>
                </div>
              </div>
            )) : <p className="muted">Import a resume to generate alumni and connection searches here.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
