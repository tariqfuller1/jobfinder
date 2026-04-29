"use client";

import { useState, useTransition } from "react";
import { saveProjects } from "@/app/actions/save-profile-structured";
import { parseResumeToStructured } from "@/app/actions/parse-resume";
import type { ProjectEntry } from "@/lib/profile";

function newProject(): ProjectEntry {
  return {
    id: `proj-${Date.now()}`,
    name: "",
    url: "",
    technologies: [],
    bullets: [""],
  };
}

function ProjectCard({
  project,
  onChange,
  onRemove,
}: {
  project: ProjectEntry;
  onChange: (updated: ProjectEntry) => void;
  onRemove: () => void;
}) {
  const techText = project.technologies.join(", ");
  const bulletsText = project.bullets.join("\n");

  return (
    <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Project name
          <input value={project.name} onChange={(e) => onChange({ ...project, name: e.target.value })} placeholder="My Project" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          URL (optional)
          <input value={project.url ?? ""} onChange={(e) => onChange({ ...project, url: e.target.value })} placeholder="https://github.com/..." />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        Technologies (comma-separated)
        <input
          value={techText}
          onChange={(e) => onChange({ ...project, technologies: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
          placeholder="React, Node.js, PostgreSQL"
        />
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        Description bullets (one per line)
        <textarea
          value={bulletsText}
          onChange={(e) => onChange({ ...project, bullets: e.target.value.split("\n") })}
          rows={3}
          placeholder={"Built a REST API that handles X requests/day\nReduced load time by 40% using lazy loading"}
          style={{ resize: "vertical", fontSize: 13 }}
        />
      </label>
      <button type="button" className="button secondary" onClick={onRemove} style={{ fontSize: 12, color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}>
        Remove project
      </button>
    </div>
  );
}

export function ProjectsEditor({
  initialProjects,
  resumeText,
}: {
  initialProjects: ProjectEntry[];
  resumeText?: string;
}) {
  const [projects, setProjects] = useState<ProjectEntry[]>(initialProjects);
  const [isSaving, startSave] = useTransition();
  const [isParsing, startParse] = useTransition();
  const [parseError, setParseError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateProject(id: string, updated: ProjectEntry) {
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  function removeProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSave() {
    setSaved(false);
    startSave(async () => {
      await saveProjects(projects);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleParse() {
    if (!resumeText?.trim()) return;
    setParseError("");
    startParse(async () => {
      const result = await parseResumeToStructured(resumeText);
      if (result.ok && result.data.projects.length > 0) {
        setProjects(result.data.projects);
      } else if (!result.ok) {
        setParseError(result.error);
      } else {
        setParseError("No projects found in the resume text.");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {resumeText?.trim() && (
          <button type="button" className="button secondary" onClick={handleParse} disabled={isParsing} style={{ fontSize: 13 }}>
            {isParsing ? "Parsing resume…" : "Extract from resume"}
          </button>
        )}
        <button type="button" className="button secondary" onClick={() => setProjects((p) => [...p, newProject()])} style={{ fontSize: 13 }}>
          + Add project
        </button>
      </div>
      {parseError && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{parseError}</p>}

      {projects.length === 0 && (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          No projects added yet. Click "Extract from resume" or "Add project" to start.
        </p>
      )}

      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onChange={(updated) => updateProject(project.id, updated)}
          onRemove={() => removeProject(project.id)}
        />
      ))}

      {projects.length > 0 && (
        <button type="button" className="button" onClick={handleSave} disabled={isSaving} style={{ justifyContent: "center" }}>
          {isSaving ? "Saving…" : saved ? "Saved!" : "Save projects"}
        </button>
      )}
    </div>
  );
}
