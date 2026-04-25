"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const US_STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const COUNTRIES = [
  "United States",
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Belarus",
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana",
  "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon",
  "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominican Republic", "DR Congo", "Ecuador", "Egypt",
  "El Salvador", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
  "Guinea", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
  "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
  "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova",
  "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palestine", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
  "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe",
];

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
    country: searchParams.get("country") ?? "",
    employmentType: searchParams.get("employmentType") ?? "",
    experienceLevel: searchParams.get("experienceLevel") ?? "",
    workplaceType: searchParams.get("workplaceType") ?? "",
    recommendedOnly: searchParams.get("recommendedOnly") ?? "",
  });

  const [selectedStates, setSelectedStates] = useState<Set<string>>(() => {
    const raw = searchParams.get("states") ?? "";
    return new Set(raw ? raw.split(",").filter(Boolean) : []);
  });

  const [showAllStates, setShowAllStates] = useState(selectedStates.size > 0);

  const isUS = fields.country === "United States";

  const activeCount =
    Object.values(fields).filter(Boolean).length +
    (selectedStates.size > 0 ? 1 : 0);

  function toggleState(abbr: string) {
    setSelectedStates((prev) => {
      const next = new Set(prev);
      if (next.has(abbr)) next.delete(abbr);
      else next.add(abbr);
      return next;
    });
  }

  function setCountry(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setFields((f) => ({ ...f, country: value }));
    if (value !== "United States") {
      setSelectedStates(new Set());
      setShowAllStates(false);
    }
  }

  function apply() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value) params.set(key, value);
    }
    if (isUS && selectedStates.size > 0) {
      params.set("states", [...selectedStates].join(","));
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    const empty = {
      q: "", department: "", sort: "", company: "", source: "", country: "",
      employmentType: "", experienceLevel: "", workplaceType: "", recommendedOnly: "",
    };
    setFields(empty);
    setSelectedStates(new Set());
    setShowAllStates(false);
    router.push(pathname);
  }

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") apply();
  }

  const activeStyle = {
    borderColor: "rgba(225, 29, 72, 0.55)",
    boxShadow: "0 0 0 3px rgba(225, 29, 72, 0.13)",
  };

  const inputStyle = (active: boolean) => (active ? activeStyle : {});

  return (
    <div className="filters">
      <label>
        Search
        <input
          value={fields.q}
          onChange={set("q")}
          onKeyDown={onKeyDown}
          placeholder="Unity, React, junior..."
          style={inputStyle(!!fields.q)}
        />
      </label>

      <label>
        Department
        <select value={fields.department} onChange={set("department")} style={inputStyle(!!fields.department)}>
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
        <select value={fields.sort} onChange={set("sort")} style={inputStyle(!!fields.sort)}>
          <option value="">Most recent</option>
          <option value="oldest">Oldest first</option>
          <option value="fit">Best fit score</option>
          <option value="salary">Highest salary</option>
        </select>
      </label>

      <label>
        Company
        <input
          value={fields.company}
          onChange={set("company")}
          onKeyDown={onKeyDown}
          placeholder="Epic Games, Red Hat, Discord"
          style={inputStyle(!!fields.company)}
        />
      </label>

      {/* ── Country ── */}
      <label>
        Country
        <select value={fields.country} onChange={setCountry} style={inputStyle(!!fields.country)}>
          <option value="">All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      {/* ── US States — only shown when United States is selected ── */}
      {isUS && (
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 500,
              color: selectedStates.size > 0 ? "#e11d48" : "#d4d4d8",
            }}>
              States{selectedStates.size > 0 ? ` (${selectedStates.size} selected)` : ""}
            </span>
            <button
              type="button"
              onClick={() => setShowAllStates((v) => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, color: "#6b7280", padding: 0,
              }}
            >
              {showAllStates ? "Hide" : "Pick states"}
            </button>
          </div>

          {/* Selected chips */}
          {selectedStates.size > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {[...selectedStates].map((abbr) => (
                <button
                  key={abbr}
                  type="button"
                  onClick={() => toggleState(abbr)}
                  title={US_STATES.find(([a]) => a === abbr)?.[1]}
                  style={{
                    background: "rgba(225,29,72,0.18)",
                    border: "1px solid rgba(225,29,72,0.45)",
                    borderRadius: 4,
                    color: "#f87171",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 7px",
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}
                >
                  {abbr} ×
                </button>
              ))}
            </div>
          )}

          {showAllStates && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 3,
              maxHeight: 220,
              overflowY: "auto",
              padding: "4px 2px",
            }}>
              {US_STATES.map(([abbr, name]) => {
                const active = selectedStates.has(abbr);
                return (
                  <button
                    key={abbr}
                    type="button"
                    onClick={() => toggleState(abbr)}
                    title={name}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                      padding: "4px 0",
                      borderRadius: 4,
                      border: active
                        ? "1px solid rgba(225,29,72,0.55)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: active
                        ? "rgba(225,29,72,0.18)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#f87171" : "#9ca3af",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "background 0.1s, color 0.1s",
                    }}
                  >
                    {abbr}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <label>
        Workplace
        <select value={fields.workplaceType} onChange={set("workplaceType")} style={inputStyle(!!fields.workplaceType)}>
          <option value="">All</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">On site</option>
        </select>
      </label>

      <label>
        Job type
        <select value={fields.employmentType} onChange={set("employmentType")} style={inputStyle(!!fields.employmentType)}>
          <option value="">All</option>
          <option value="FULL_TIME">Full-time</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="CONTRACT">Contract</option>
          <option value="PART_TIME">Part-time</option>
        </select>
      </label>

      <label>
        Experience
        <select value={fields.experienceLevel} onChange={set("experienceLevel")} style={inputStyle(!!fields.experienceLevel)}>
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
        <select value={fields.source} onChange={set("source")} style={inputStyle(!!fields.source)}>
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
        <select value={fields.recommendedOnly} onChange={set("recommendedOnly")} style={inputStyle(!!fields.recommendedOnly)}>
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
