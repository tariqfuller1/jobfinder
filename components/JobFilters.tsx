"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const US_STATES: [string, string][] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

const COUNTRIES = [
  "United States","Afghanistan","Albania","Algeria","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina",
  "Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Dominican Republic","Ecuador","Egypt",
  "El Salvador","Estonia","Ethiopia","Finland","France","Germany","Ghana","Greece","Guatemala",
  "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lithuania",
  "Luxembourg","Malaysia","Mexico","Moldova","Morocco","Myanmar","Nepal","Netherlands",
  "New Zealand","Nicaragua","Nigeria","Norway","Oman","Pakistan","Panama","Peru","Philippines",
  "Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Serbia","Singapore",
  "Slovakia","Slovenia","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan",
  "Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","Uruguay","Uzbekistan","Venezuela","Vietnam",
  "Yemen","Zambia","Zimbabwe",
];

const WORKPLACE = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "On site" },
];

const EXPERIENCE = [
  { value: "INTERN", label: "Intern" },
  { value: "ENTRY", label: "Entry" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
];

const JOB_TYPE = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONTRACT", label: "Contract" },
  { value: "PART_TIME", label: "Part-time" },
];

const DEPARTMENTS = [
  { value: "frontend",       label: "Frontend"     },
  { value: "backend",        label: "Backend"      },
  { value: "full_stack",     label: "Full Stack"   },
  { value: "mobile",         label: "Mobile"       },
  { value: "game_programming", label: "Game Dev"   },
  { value: "game_design",    label: "Design & Art" },
  { value: "data_and_ml",    label: "Data / AI"    },
  { value: "devops",         label: "DevOps"       },
  { value: "qa",             label: "QA / Testing" },
  { value: "embedded",       label: "Embedded"     },
];

function parseSet(raw: string | null) {
  return new Set(raw ? raw.split(",").filter(Boolean) : []);
}

function PillGroup({
  options,
  selected,
  toggle,
}: {
  options: { value: string; label: string }[];
  selected: Set<string>;
  toggle: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(({ value, label }) => {
        const active = selected.has(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 6,
              border: active ? "1px solid rgba(225,29,72,0.55)" : "1px solid rgba(255,255,255,0.1)",
              background: active ? "rgba(225,29,72,0.18)" : "rgba(255,255,255,0.04)",
              color: active ? "#f87171" : "#9ca3af",
              cursor: "pointer",
              transition: "all 0.1s",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function makeToggle(set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
  return (value: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
}

export function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const [sort, setSort] = useState(sp.get("sort") ?? "");
  const [source, setSource] = useState(sp.get("source") ?? "");
  const [country, setCountry] = useState(sp.get("country") ?? "");
  const [recommendedOnly, setRecommendedOnly] = useState(sp.get("recommendedOnly") ?? "");

  const [workplaceTypes, setWorkplaceTypes] = useState(() => parseSet(sp.get("workplaceTypes")));
  const [experienceLevels, setExperienceLevels] = useState(() => parseSet(sp.get("experienceLevels")));
  const [employmentTypes, setEmploymentTypes] = useState(() => parseSet(sp.get("employmentTypes")));
  const [departments, setDepartments] = useState(() => parseSet(sp.get("departments")));
  const [selectedStates, setSelectedStates] = useState(() => parseSet(sp.get("states")));
  const [showAllStates, setShowAllStates] = useState(selectedStates.size > 0);

  const isUS = country === "United States";

  const activeCount =
    [sort, source, country, recommendedOnly].filter(Boolean).length +
    [workplaceTypes, experienceLevels, employmentTypes, departments, selectedStates].filter((s) => s.size > 0).length;

  function apply() {
    const params = new URLSearchParams(sp.toString());
    if (sort) params.set("sort", sort); else params.delete("sort");
    if (source) params.set("source", source); else params.delete("source");
    if (country) params.set("country", country); else params.delete("country");
    if (recommendedOnly) params.set("recommendedOnly", recommendedOnly); else params.delete("recommendedOnly");
    if (workplaceTypes.size) params.set("workplaceTypes", [...workplaceTypes].join(",")); else params.delete("workplaceTypes");
    if (experienceLevels.size) params.set("experienceLevels", [...experienceLevels].join(",")); else params.delete("experienceLevels");
    if (employmentTypes.size) params.set("employmentTypes", [...employmentTypes].join(",")); else params.delete("employmentTypes");
    if (departments.size) params.set("departments", [...departments].join(",")); else params.delete("departments");
    if (isUS && selectedStates.size) params.set("states", [...selectedStates].join(",")); else params.delete("states");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function clear() {
    setSort(""); setSource(""); setCountry(""); setRecommendedOnly("");
    setWorkplaceTypes(new Set()); setExperienceLevels(new Set());
    setEmploymentTypes(new Set()); setDepartments(new Set());
    setSelectedStates(new Set()); setShowAllStates(false);
    const params = new URLSearchParams(sp.toString());
    ["sort","source","country","recommendedOnly","workplaceTypes","experienceLevels","employmentTypes","departments","states","page"].forEach((k) => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const activeStyle = { borderColor: "rgba(225,29,72,0.55)", boxShadow: "0 0 0 3px rgba(225,29,72,0.13)" };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="button secondary"
        onClick={() => setOpen((o) => !o)}
        style={{ whiteSpace: "nowrap", gap: 6 }}
      >
        ⊞ Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          zIndex: 150,
          width: "min(340px, calc(100vw - 20px))",
          background: "linear-gradient(180deg, rgba(20,20,22,0.99), rgba(12,12,14,1))",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: 20,
          display: "grid",
          gap: 14,
          maxHeight: "calc(100vh - 180px)",
          overflowY: "auto",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: departments.size ? "#f87171" : "#d4d4d8", marginBottom: 8 }}>
              Department{departments.size > 0 ? ` (${departments.size})` : ""}
            </div>
            <PillGroup options={DEPARTMENTS} selected={departments} toggle={makeToggle(departments, setDepartments)} />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: workplaceTypes.size ? "#f87171" : "#d4d4d8", marginBottom: 8 }}>
              Workplace{workplaceTypes.size > 0 ? ` (${workplaceTypes.size})` : ""}
            </div>
            <PillGroup options={WORKPLACE} selected={workplaceTypes} toggle={makeToggle(workplaceTypes, setWorkplaceTypes)} />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: experienceLevels.size ? "#f87171" : "#d4d4d8", marginBottom: 8 }}>
              Experience{experienceLevels.size > 0 ? ` (${experienceLevels.size})` : ""}
            </div>
            <PillGroup options={EXPERIENCE} selected={experienceLevels} toggle={makeToggle(experienceLevels, setExperienceLevels)} />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: employmentTypes.size ? "#f87171" : "#d4d4d8", marginBottom: 8 }}>
              Job type{employmentTypes.size > 0 ? ` (${employmentTypes.size})` : ""}
            </div>
            <PillGroup options={JOB_TYPE} selected={employmentTypes} toggle={makeToggle(employmentTypes, setEmploymentTypes)} />
          </div>

          <label>
            Country
            <select value={country} onChange={(e) => { setCountry(e.target.value); if (e.target.value !== "United States") { setSelectedStates(new Set()); setShowAllStates(false); } }} style={country ? activeStyle : {}}>
              <option value="">All countries</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {isUS && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: selectedStates.size > 0 ? "#f87171" : "#d4d4d8" }}>
                  States{selectedStates.size > 0 ? ` (${selectedStates.size})` : ""}
                </span>
                <button type="button" onClick={() => setShowAllStates((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280", padding: 0 }}>
                  {showAllStates ? "Hide" : "Pick states"}
                </button>
              </div>
              {selectedStates.size > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {[...selectedStates].map((abbr) => (
                    <button key={abbr} type="button" onClick={() => makeToggle(selectedStates, setSelectedStates)(abbr)}
                      style={{ background: "rgba(225,29,72,0.18)", border: "1px solid rgba(225,29,72,0.45)", borderRadius: 4, color: "#f87171", fontSize: 11, fontWeight: 600, padding: "2px 7px", cursor: "pointer" }}>
                      {abbr} ×
                    </button>
                  ))}
                </div>
              )}
              {showAllStates && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, maxHeight: 180, overflowY: "auto", padding: "4px 2px" }}>
                  {US_STATES.map(([abbr, name]) => {
                    const active = selectedStates.has(abbr);
                    return (
                      <button key={abbr} type="button" onClick={() => makeToggle(selectedStates, setSelectedStates)(abbr)} title={name}
                        style={{ fontSize: 11, fontWeight: 600, padding: "4px 0", borderRadius: 4, border: active ? "1px solid rgba(225,29,72,0.55)" : "1px solid rgba(255,255,255,0.08)", background: active ? "rgba(225,29,72,0.18)" : "rgba(255,255,255,0.04)", color: active ? "#f87171" : "#9ca3af", cursor: "pointer", textAlign: "center" }}>
                        {abbr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <label>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={sort ? activeStyle : {}}>
              <option value="">Most recent</option>
              <option value="oldest">Oldest first</option>
              <option value="fit">Best fit score</option>
              <option value="salary">Highest salary</option>
            </select>
          </label>

          <label>
            Source
            <select value={source} onChange={(e) => setSource(e.target.value)} style={source ? activeStyle : {}}>
              <option value="">All sources</option>
              <option value="indeed">Indeed</option>
              <option value="games-workbook">Games Workbook</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
              <option value="ashby">Ashby</option>
              <option value="workable">Workable</option>
              <option value="recruitee">Recruitee</option>
              <option value="remotive">Remotive</option>
              <option value="arbeitnow">Arbeitnow</option>
              <option value="usajobs">USA Jobs</option>
            </select>
          </label>

          <label>
            Best-fit only
            <select value={recommendedOnly} onChange={(e) => setRecommendedOnly(e.target.value)} style={recommendedOnly ? activeStyle : {}}>
              <option value="">All jobs</option>
              <option value="true">Best-fit only</option>
            </select>
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <button className="button" onClick={apply} style={{ width: "100%", justifyContent: "center" }}>
              Apply{activeCount > 0 ? ` (${activeCount} active)` : ""}
            </button>
            {activeCount > 0 && (
              <button className="button secondary" onClick={clear} style={{ width: "100%", justifyContent: "center" }}>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
