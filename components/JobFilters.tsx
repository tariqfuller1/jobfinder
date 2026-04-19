"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [fields, setFields] = useState({
    q: searchParams.get("q") ?? "",
    department: searchParams.get("department") ?? "",
    sort: searchParams.get("sort") ?? "",
    company: searchParams.get("company") ?? "",
    source: searchParams.get("source") ?? "",
    location: searchParams.get("location") ?? "",
    employmentType: searchParams.get("employmentType") ?? "",
    experienceLevel: searchParams.get("experienceLevel") ?? "",
    workplaceType: searchParams.get("workplaceType") ?? "",
    recommendedOnly: searchParams.get("recommendedOnly") ?? "",
  });

  const activeCount = Object.values(fields).filter(Boolean).length;

  function apply() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value) params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    const empty = {
      q: "", department: "", sort: "", company: "", source: "", location: "",
      employmentType: "", experienceLevel: "", workplaceType: "", recommendedOnly: "",
    };
    setFields(empty);
    router.push(pathname);
  }

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") apply();
  }

  const inputStyle = (key: keyof typeof fields) =>
    fields[key]
      ? { borderColor: "rgba(225, 29, 72, 0.55)", boxShadow: "0 0 0 3px rgba(225, 29, 72, 0.13)" }
      : {};

  return (
    <div className="filters">
      <label>
        Search
        <input
          value={fields.q}
          onChange={set("q")}
          onKeyDown={onKeyDown}
          placeholder="Unity, React, junior..."
          style={inputStyle("q")}
        />
      </label>

      <label>
        Department
        <select value={fields.department} onChange={set("department")} style={inputStyle("department")}>
          <option value="">All departments</option>
          <option value="software_engineering">Software Engineering</option>
          <option value="game_programming">Game Programming</option>
          <option value="game_design">Game Design &amp; Art</option>
          <option value="mobile_development">Mobile Development</option>
          <option value="data_and_ml">Data &amp; ML / AI</option>
        </select>
      </label>

      <label>
        Sort by
        <select value={fields.sort} onChange={set("sort")} style={inputStyle("sort")}>
          <option value="">Most recent</option>
          <option value="oldest">Oldest first</option>
        </select>
      </label>

      <label>
        Company
        <input
          value={fields.company}
          onChange={set("company")}
          onKeyDown={onKeyDown}
          placeholder="Epic Games, Red Hat, Discord"
          style={inputStyle("company")}
        />
      </label>

      <label>
        Location
        <input
          value={fields.location}
          onChange={set("location")}
          onKeyDown={onKeyDown}
          placeholder="Charlotte, Raleigh, Remote"
          style={inputStyle("location")}
        />
      </label>

      <label>
        Workplace
        <select value={fields.workplaceType} onChange={set("workplaceType")} style={inputStyle("workplaceType")}>
          <option value="">All</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">On site</option>
        </select>
      </label>

      <label>
        Job type
        <select value={fields.employmentType} onChange={set("employmentType")} style={inputStyle("employmentType")}>
          <option value="">All</option>
          <option value="FULL_TIME">Full-time</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="CONTRACT">Contract</option>
          <option value="PART_TIME">Part-time</option>
        </select>
      </label>

      <label>
        Experience
        <select value={fields.experienceLevel} onChange={set("experienceLevel")} style={inputStyle("experienceLevel")}>
          <option value="">All</option>
          <option value="INTERN">Intern</option>
          <option value="ENTRY">Entry</option>
          <option value="MID">Mid</option>
          <option value="SENIOR">Senior</option>
          <option value="LEAD">Lead</option>
        </select>
      </label>

      <label>
        Source
        <select value={fields.source} onChange={set("source")} style={inputStyle("source")}>
          <option value="">All sources</option>
          <optgroup label="Game-specific">
            <option value="games-workbook">Games Workbook</option>
          </optgroup>
          <optgroup label="ATS boards">
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
            <option value="workable">Workable</option>
            <option value="recruitee">Recruitee</option>
          </optgroup>
          <optgroup label="Job feeds">
            <option value="remotive">Remotive</option>
            <option value="arbeitnow">Arbeitnow</option>
            <option value="usajobs">USA Jobs</option>
          </optgroup>
        </select>
      </label>

      <label>
        Best-fit only
        <select value={fields.recommendedOnly} onChange={set("recommendedOnly")} style={inputStyle("recommendedOnly")}>
          <option value="">All jobs</option>
          <option value="true">Best-fit only</option>
        </select>
      </label>

      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <button className="button" onClick={apply} style={{ width: "100%", justifyContent: "center" }}>
          Apply filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {activeCount > 0 && (
          <button className="button secondary" onClick={clear} style={{ width: "100%", justifyContent: "center" }}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
