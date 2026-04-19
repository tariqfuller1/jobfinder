"use client";

import { useState } from "react";

type ImportedProfile = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  educationEntries?: string[];
  skills?: string[];
  schoolKeywords?: string[];
  connectionKeywords?: string[];
};

export function ResumeImportForm() {
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ImportedProfile | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("resumeText", resumeText);
      if (file) formData.set("resumeFile", file);

      const response = await fetch("/api/profile/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not import that resume.");
      }

      setProfile(data.profile);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import that resume.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label>
        Upload resume
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <label>
        Or paste resume text
        <textarea
          rows={10}
          placeholder="Paste your resume here if you do not want to upload a file."
          value={resumeText}
          onChange={(event) => setResumeText(event.target.value)}
        />
      </label>

      <div className="actions">
        <button className="button" type="submit" disabled={isLoading}>
          {isLoading ? "Importing..." : "Import resume"}
        </button>
      </div>

      {error ? <p className="muted">{error}</p> : null}

      {profile ? (
        <div className="inset-card stack compact-stack">
          <strong>{profile.name ?? "Resume imported"}</strong>
          <p className="muted" style={{ margin: 0 }}>
            {(profile.educationEntries ?? []).slice(0, 2).join(" • ") || "Education parsed"}
          </p>
          <div className="badges">
            {(profile.skills ?? []).slice(0, 8).map((skill) => (
              <span key={skill} className="badge">
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
