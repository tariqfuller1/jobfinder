import { ResumeImportForm } from "@/components/ResumeImportForm";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { LinksEditor } from "@/components/LinksEditor";
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

  return (
    <div className="stack page-stack-lg" style={{ padding: "24px 0 40px" }}>
      <section className="hero-grid card hero-card">
        <div className="stack compact-stack hero-copy">
          <div className="eyebrow">Account workspace</div>
          <h1 className="section-title">Your saved profile powers the whole site</h1>
          <p className="muted hero-lead">
            Signed in as {user.displayName || user.email}. Your resume, preferred locations, target roles, and job preferences live here and stay attached to this account.
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
              <div className="metric-label">Target titles</div>
              <div className="metric-value">{profile.targetTitles.length}</div>
              <div className="metric-note">Preferred job families</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Connection angles</div>
              <div className="metric-value">{profile.schoolKeywords.length + profile.companiesWorked.length}</div>
              <div className="metric-note">Schools and orgs</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <section className="card hero-card stack">
          <div>
            <div className="eyebrow">Resume source of truth</div>
            <h2 className="section-title">Import or replace your resume</h2>
            <p className="muted">
              Upload your resume and the app will extract your schools, skills, and connection angles so job matches, resume rewrites, cover letters, and outreach suggestions use your actual background.
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
            <h3 className="section-title" style={{ marginBottom: 8 }}>Preferred job locations</h3>
            <div className="badges">
              {profile.preferredLocations.map((entry) => (
                <span key={entry} className="badge">{entry}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="section-title" style={{ marginBottom: 8 }}>Skills powering job match</h3>
            <div className="badges">
              {profile.skills.slice(0, 20).map((skill) => (
                <span key={skill} className="badge">{skill}</span>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="card stack">
        <div>
          <div className="eyebrow">Quick access</div>
          <h2 className="section-title">Your links</h2>
          <p className="muted">
            Save your LinkedIn, GitHub, portfolio, and any other links here. They appear on your dashboard for one-click access and are always in one place.
          </p>
        </div>
        <LinksEditor initialLinks={profile.links} />
      </section>

      <section className="card stack">
        <div>
          <div className="eyebrow">Preference tuning</div>
          <h2 className="section-title">Edit profile settings</h2>
          <p className="muted">
            Set your location preferences, job targets, and keywords here. These settings shape which roles are recommended and how the site rewrites your resume for each job.
          </p>
        </div>
        <ProfileSettingsForm profile={profile} />
      </section>

      <section className="grid-2">
        <article className="card stack compact-stack">
          <h2 className="section-title">Connection angles</h2>
          <p className="muted">
            These searches turn your saved resume details into warm-intro angles you can use on company pages and job detail pages.
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
            <h3 className="section-title" style={{ marginBottom: 8 }}>Past companies and orgs</h3>
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
