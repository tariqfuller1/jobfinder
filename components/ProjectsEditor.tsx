"use client";

import { useState, useEffect, useRef, useTransition } from "react";
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

function DragHandle({ onDragStart, onDragEnd }: { onDragStart: () => void; onDragEnd: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title="Drag to reorder"
      style={{
        cursor: "grab",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 3,
        padding: "4px 0 8px",
        marginBottom: 2,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        userSelect: "none",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {[0, 1, 2].map((r) => (
          <span key={r} style={{ display: "flex", gap: 3 }}>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#4b5563" }} />
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#4b5563" }} />
          </span>
        ))}
      </span>
    </div>
  );
}

function ProjectCard({
  project,
  onChange,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  project: ProjectEntry;
  onChange: (updated: ProjectEntry) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const [techText, setTechText] = useState(() => project.technologies.join(", "));
  const bulletsText = project.bullets.join("\n");
  const included = project.includedInResume !== false;

  useEffect(() => {
    setTechText(project.technologies.join(", "));
  }, [project.technologies]);

  return (
    <div className="inset-card" style={{ padding: "14px 16px", display: "grid", gap: 10, opacity: isDragging ? 0.4 : included ? 1 : 0.6, transition: "opacity 0.15s" }}>
      <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Project name
          <input value={project.name} onChange={(e) => onChange({ ...project, name: e.target.value })} placeholder="My Project" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          URL (optional)
          <input value={project.url ?? ""} onChange={(e) => onChange({ ...project, url: e.target.value })} placeholder="https://github.com/..." />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Start date
          <input value={project.startDate ?? ""} onChange={(e) => onChange({ ...project, startDate: e.target.value })} placeholder="Jan 2023" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          End date
          <input value={project.endDate ?? ""} onChange={(e) => onChange({ ...project, endDate: e.target.value })} placeholder="Present" />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        Technologies (comma-separated)
        <input
          value={techText}
          onChange={(e) => setTechText(e.target.value)}
          onBlur={() => onChange({ ...project, technologies: techText.split(",").map((t) => t.trim()).filter(Boolean) })}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange({ ...project, includedInResume: !included })}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ width: 34, height: 18, borderRadius: 999, flexShrink: 0, background: included ? "#4ade80" : "#374151", position: "relative", display: "inline-block", transition: "background 0.15s" }}>
            <span style={{ position: "absolute", top: 2, left: included ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
          </span>
          <span style={{ fontSize: 12, color: included ? "#4ade80" : "#6b7280" }}>
            {included ? "Include in resume" : "Excluded from resume"}
          </span>
        </button>
        <button type="button" className="button secondary" onClick={onRemove} style={{ fontSize: 12, color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}>
          Remove project
        </button>
      </div>
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
  const [isParsing, startParse] = useTransition();
  const [parseError, setParseError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Auto-save 1 second after the last change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      await saveProjects(projects);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [projects]);

  function updateProject(id: string, updated: ProjectEntry) {
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  function removeProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...projects];
    const [item] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, item);
    setProjects(next);
    setDragIndex(null);
    setDragOverIndex(null);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
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
        <span style={{ fontSize: 12, color: saveStatus === "saved" ? "#4ade80" : "#6b7280", transition: "color 0.2s" }}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : projects.length > 0 ? "Auto-saves after changes" : ""}
        </span>
      </div>

      {parseError && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{parseError}</p>}

      {projects.length === 0 && (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          No projects added yet. Click "Extract from resume" or "Add project" to start.
        </p>
      )}

      {projects.map((project, index) => (
        <div
          key={project.id}
          onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== index) setDragOverIndex(index); }}
          onDrop={(e) => { e.preventDefault(); handleDrop(index); }}
          style={{
            borderRadius: 8,
            outline: dragOverIndex === index && dragIndex !== index ? "2px solid #6366f1" : "2px solid transparent",
            outlineOffset: 2,
            transition: "outline 0.1s",
          }}
        >
          <ProjectCard
            project={project}
            onChange={(updated) => updateProject(project.id, updated)}
            onRemove={() => removeProject(project.id)}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
            isDragging={dragIndex === index}
          />
        </div>
      ))}
    </div>
  );
}
