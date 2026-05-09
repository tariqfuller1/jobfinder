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

const QUICK_STATES = ["NC", "CA", "WA", "TX", "NY", "MA", "GA", "FL", "IL", "CO"];

const STATE_NAMES: Record<string, string> = Object.fromEntries(US_STATES);

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "Netherlands", "Sweden", "Denmark", "Finland", "Norway", "Poland", "Spain",
  "Ireland", "Singapore", "Japan", "South Korea", "Brazil", "India", "New Zealand",
];

export function CompanyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showAllStates, setShowAllStates] = useState(false);

  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [remotePolicy, setRemotePolicy] = useState(sp.get("remotePolicy") ?? "");
  const [skill, setSkill] = useState(sp.get("skill") ?? "");
  const [state, setState] = useState(sp.get("state") ?? "");
  const [country, setCountry] = useState(sp.get("country") ?? "");
  const [ats, setAts] = useState(sp.get("ats") ?? "");
  const [size, setSize] = useState(sp.get("size") ?? "");
  const [activeHiring, setActiveHiring] = useState(sp.get("activeHiring") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "");

  const activeCount = [category, remotePolicy, skill, state, country, ats, size, activeHiring, sort].filter(Boolean).length;

  function push(overrides: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    const vals: Record<string, string> = { category, remotePolicy, skill, state, country, ats, size, activeHiring, sort, ...overrides };
    const keys = ["category","remotePolicy","skill","state","country","ats","size","activeHiring","sort"];
    keys.forEach((k) => vals[k] ? params.set(k, vals[k]) : params.delete(k));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function apply() { push({}); }

  function clear() {
    setCategory(""); setRemotePolicy(""); setSkill(""); setState(""); setCountry("");
    setAts(""); setSize(""); setActiveHiring(""); setSort("");
    const params = new URLSearchParams(sp.toString());
    ["category","remotePolicy","skill","state","country","ats","size","activeHiring","sort","page"].forEach((k) => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function toggleState(abbr: string) {
    const next = state === abbr ? "" : abbr;
    setState(next);
    if (next) setCountry(""); // state and country are mutually exclusive
  }

  const activeStyle = { borderColor: "rgba(225,29,72,0.55)", boxShadow: "0 0 0 3px rgba(225,29,72,0.13)" };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="button secondary"
        onClick={() => setOpen((o) => !o)}
        style={{ whiteSpace: "nowrap" }}
      >
        ⊞ Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          zIndex: 150,
          width: "min(380px, calc(100vw - 20px))",
          background: "linear-gradient(180deg, rgba(20,20,22,0.99), rgba(12,12,14,1))",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: 20,
          display: "grid",
          gap: 16,
          maxHeight: "calc(100vh - 160px)",
          overflowY: "auto",
        }}>

          {/* ── Company type ── */}
          <div>
            <div style={sectionLabel(!!category)}>Company type</div>
            <div style={pillRow}>
              {[["", "All"], ["SOFTWARE", "Software"], ["GAMING", "Gaming"], ["BOTH", "Both"]].map(([v, l]) => (
                <Pill key={v} active={category === v} onClick={() => setCategory(v)}>{l}</Pill>
              ))}
            </div>
          </div>

          {/* ── Remote policy ── */}
          <div>
            <div style={sectionLabel(!!remotePolicy)}>Remote policy</div>
            <div style={pillRow}>
              {[["", "Any"], ["REMOTE_FRIENDLY", "Remote-friendly"], ["FLEXIBLE", "Flexible"], ["HYBRID", "Hybrid"], ["ONSITE", "On-site"]].map(([v, l]) => (
                <Pill key={v} active={remotePolicy === v} onClick={() => setRemotePolicy(v)}>{l}</Pill>
              ))}
            </div>
          </div>

          {/* ── Hiring ── */}
          <div>
            <div style={sectionLabel(!!activeHiring)}>Status</div>
            <div style={pillRow}>
              <Pill active={activeHiring === ""} onClick={() => setActiveHiring("")}>All</Pill>
              <Pill active={activeHiring === "true"} onClick={() => setActiveHiring("true")}>Hiring now</Pill>
            </div>
          </div>

          {/* ── US State ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={sectionLabel(!!state)}>US state{state ? ` — ${STATE_NAMES[state] ?? state}` : ""}</div>
              <button
                type="button"
                onClick={() => setShowAllStates((v) => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6b7280", padding: 0 }}
              >
                {showAllStates ? "Hide" : "All states"}
              </button>
            </div>
            {/* Quick states */}
            <div style={pillRow}>
              {QUICK_STATES.map((abbr) => (
                <Pill key={abbr} active={state === abbr} onClick={() => toggleState(abbr)}>
                  {abbr}
                </Pill>
              ))}
              {state && !QUICK_STATES.includes(state) && (
                <Pill active onClick={() => setState("")}>{state} ×</Pill>
              )}
            </div>
            {/* Full state grid */}
            {showAllStates && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
                {US_STATES.map(([abbr, name]) => (
                  <button
                    key={abbr}
                    type="button"
                    title={name}
                    onClick={() => toggleState(abbr)}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: "5px 0", textAlign: "center",
                      borderRadius: 6, cursor: "pointer",
                      border: state === abbr ? "1px solid rgba(225,29,72,0.55)" : "1px solid rgba(255,255,255,0.08)",
                      background: state === abbr ? "rgba(225,29,72,0.18)" : "rgba(255,255,255,0.04)",
                      color: state === abbr ? "#f87171" : "#9ca3af",
                    }}
                  >
                    {abbr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Country ── */}
          <label>
            <div style={sectionLabel(!!country)}>Country</div>
            <select value={country} onChange={(e) => { setCountry(e.target.value); if (e.target.value) setState(""); }} style={country ? activeStyle : {}}>
              <option value="">All countries</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {/* ── Skill / stack ── */}
          <label>
            <div style={sectionLabel(!!skill)}>Skill / engine / stack</div>
            <input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Unity, React, C++, Python…"
              style={skill ? activeStyle : {}}
            />
          </label>

          {/* ── Sort ── */}
          <div>
            <div style={sectionLabel(!!sort)}>Sort by</div>
            <div style={pillRow}>
              {[["", "Hiring status"], ["fit", "Best fit"], ["jobs", "Most jobs"], ["name", "A – Z"]].map(([v, l]) => (
                <Pill key={v} active={sort === v} onClick={() => setSort(v)}>{l}</Pill>
              ))}
            </div>
          </div>

          {/* ── Advanced: ATS + size ── */}
          <details>
            <summary style={{ fontSize: 12, color: "#6b7280", cursor: "pointer", marginBottom: 10 }}>Advanced filters</summary>
            <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
              <label>
                <div style={sectionLabel(!!ats)}>ATS / source</div>
                <input value={ats} onChange={(e) => setAts(e.target.value)} placeholder="Greenhouse, Lever, Ashby" style={ats ? activeStyle : {}} />
              </label>
              <label>
                <div style={sectionLabel(!!size)}>Company size</div>
                <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="1–50, 51–200, 1000+" style={size ? activeStyle : {}} />
              </label>
            </div>
          </details>

          {/* ── Actions ── */}
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

function sectionLabel(active: boolean) {
  return { fontSize: 12, fontWeight: 600, color: active ? "#f87171" : "#9ca3af", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" as const };
}
const pillRow = { display: "flex", flexWrap: "wrap" as const, gap: 5 };

function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 999, cursor: "pointer",
        border: active ? "1px solid rgba(225,29,72,0.55)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(225,29,72,0.18)" : "rgba(255,255,255,0.04)",
        color: active ? "#f87171" : "#9ca3af",
        transition: "all 0.1s",
      }}
    >
      {children}
    </button>
  );
}
