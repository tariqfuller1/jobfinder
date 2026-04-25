"use client";

import { useMemo, useState } from "react";
import type { UserProfile } from "@/lib/profile";

function toText(values: string[]) {
  return values.join(", ");
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ProfileSettingsForm({ profile }: { profile: UserProfile }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [headline, setHeadline] = useState(profile.headline);
  const [summary, setSummary] = useState(profile.summary);
  const [preferredLocations, setPreferredLocations] = useState(toText(profile.preferredLocations));
  const [preferredStates, setPreferredStates] = useState(toText(profile.preferredStates));
  const [targetTitles, setTargetTitles] = useState(toText(profile.targetTitles));
  const [skills, setSkills] = useState(toText(profile.skills));
  const [stacks, setStacks] = useState(toText(profile.stacks));
  const [industries, setIndustries] = useState(toText(profile.industries));
  const [educationEntries, setEducationEntries] = useState(toText(profile.educationEntries));
  const [companiesWorked, setCompaniesWorked] = useState(toText(profile.companiesWorked));
  const [schoolKeywords, setSchoolKeywords] = useState(toText(profile.schoolKeywords));
  const [connectionKeywords, setConnectionKeywords] = useState(toText(profile.connectionKeywords));
  const [contactRoleTargets, setContactRoleTargets] = useState(toText(profile.contactRoleTargets));
  const [remotePreference, setRemotePreference] = useState<string[]>(profile.remotePreference);
  const [targetCategories, setTargetCategories] = useState<string[]>(profile.targetCategories);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resumeWordCount = useMemo(() => {
    const text = profile.resumeText?.trim() ?? "";
    return text ? text.split(/\s+/).length : 0;
  }, [profile.resumeText]);

  const toggle = (current: string[], value: string) => {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          location,
          headline,
          summary,
          preferredLocations: parseCsv(preferredLocations),
          preferredStates: parseCsv(preferredStates),
          targetTitles: parseCsv(targetTitles),
          skills: parseCsv(skills),
          stacks: parseCsv(stacks),
          industries: parseCsv(industries),
          educationEntries: parseCsv(educationEntries),
          companiesWorked: parseCsv(companiesWorked),
          schoolKeywords: parseCsv(schoolKeywords),
          connectionKeywords: parseCsv(connectionKeywords),
          contactRoleTargets: parseCsv(contactRoleTargets),
          remotePreference,
          targetCategories,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not save profile settings.");
      }

      setMessage("Profile settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="grid-2 profile-edit-grid">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label>
          Current location
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, State" />
        </label>
      </div>

      <label>
        Headline
        <input value={headline} onChange={(event) => setHeadline(event.target.value)} />
      </label>

      <label>
        Summary
        <textarea rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>

      <div className="grid-2 profile-edit-grid">
        <label>
          Preferred job locations
          <input value={preferredLocations} onChange={(event) => setPreferredLocations(event.target.value)} placeholder="Remote US, Austin TX, New York NY" />
        </label>
        <label>
          Preferred states
          <input value={preferredStates} onChange={(event) => setPreferredStates(event.target.value)} placeholder="TX, NY, CA" />
        </label>
        <label>
          Target job titles
          <input value={targetTitles} onChange={(event) => setTargetTitles(event.target.value)} placeholder="software engineer, backend engineer" />
        </label>
        <label>
          Industries
          <input value={industries} onChange={(event) => setIndustries(event.target.value)} placeholder="SaaS, FinTech, Healthcare" />
        </label>
        <label>
          Skills
          <textarea rows={4} value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Python, Java, SQL" />
        </label>
        <label>
          Tech stacks
          <textarea rows={4} value={stacks} onChange={(event) => setStacks(event.target.value)} placeholder="Django, PostgreSQL, AWS" />
        </label>
        <label>
          Education entries
          <textarea rows={3} value={educationEntries} onChange={(event) => setEducationEntries(event.target.value)} />
        </label>
        <label>
          Companies and orgs worked with
          <textarea rows={3} value={companiesWorked} onChange={(event) => setCompaniesWorked(event.target.value)} />
        </label>
        <label>
          Alumni and school keywords
          <textarea rows={3} value={schoolKeywords} onChange={(event) => setSchoolKeywords(event.target.value)} />
        </label>
        <label>
          Connection keywords
          <textarea rows={3} value={connectionKeywords} onChange={(event) => setConnectionKeywords(event.target.value)} />
        </label>
        <label>
          Contact role targets
          <textarea rows={3} value={contactRoleTargets} onChange={(event) => setContactRoleTargets(event.target.value)} />
        </label>
      </div>

      <div className="grid-2 profile-edit-grid">
        <fieldset className="inset-card checkbox-grid">
          <legend>Workplace preference</legend>
          {[
            ["REMOTE", "Remote"],
            ["HYBRID", "Hybrid"],
            ["ONSITE", "On-site"],
          ].map(([value, label]) => (
            <label key={value} className="checkbox-row">
              <input
                type="checkbox"
                checked={remotePreference.includes(value)}
                onChange={() => setRemotePreference((current) => toggle(current, value))}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="inset-card checkbox-grid">
          <legend>Target categories</legend>
          {[
            ["SOFTWARE", "Software"],
            ["GAMING", "Gaming"],
            ["BOTH", "Both"],
          ].map(([value, label]) => (
            <label key={value} className="checkbox-row">
              <input
                type="checkbox"
                checked={targetCategories.includes(value)}
                onChange={() => setTargetCategories((current) => toggle(current, value))}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="inset-card stack compact-stack">
        <strong>Saved resume</strong>
        <p className="muted" style={{ margin: 0 }}>
          {profile.rawUploadName ? `${profile.rawUploadName} • ${resumeWordCount} words extracted` : "No resume uploaded yet."}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Uploading a new resume will refresh the parsed skills, schools, and connection keywords, but your manual settings here still stay attached to your account.
        </p>
      </div>

      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}
      {message ? <p className="muted" style={{ margin: 0 }}>{message}</p> : null}

      <div className="actions">
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save profile settings"}
        </button>
      </div>
    </form>
  );
}
