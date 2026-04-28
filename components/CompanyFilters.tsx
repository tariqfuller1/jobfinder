"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function CompanyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [remotePolicy, setRemotePolicy] = useState(sp.get("remotePolicy") ?? "");
  const [skill, setSkill] = useState(sp.get("skill") ?? "");
  const [state, setState] = useState(sp.get("state") ?? "");
  const [location, setLocation] = useState(sp.get("location") ?? "");
  const [ats, setAts] = useState(sp.get("ats") ?? "");
  const [size, setSize] = useState(sp.get("size") ?? "");
  const [activeHiring, setActiveHiring] = useState(sp.get("activeHiring") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "");

  const activeCount = [category, remotePolicy, skill, state, location, ats, size, activeHiring, sort].filter(Boolean).length;

  function apply() {
    const params = new URLSearchParams(sp.toString());
    const set = (k: string, v: string) => v ? params.set(k, v) : params.delete(k);
    set("category", category); set("remotePolicy", remotePolicy); set("skill", skill);
    set("state", state); set("location", location); set("ats", ats);
    set("size", size); set("activeHiring", activeHiring); set("sort", sort);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function clear() {
    setCategory(""); setRemotePolicy(""); setSkill(""); setState(""); setLocation("");
    setAts(""); setSize(""); setActiveHiring(""); setSort("");
    const params = new URLSearchParams(sp.toString());
    ["category","remotePolicy","skill","state","location","ats","size","activeHiring","sort","page"].forEach((k) => params.delete(k));
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
          zIndex: 50,
          width: 320,
          background: "linear-gradient(180deg, rgba(20,20,22,0.99), rgba(12,12,14,1))",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: 20,
          display: "grid",
          gap: 14,
        }}>
          <label>
            Company type
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={category ? activeStyle : {}}>
              <option value="">All</option>
              <option value="SOFTWARE">Software</option>
              <option value="GAMING">Gaming</option>
              <option value="BOTH">Both</option>
            </select>
          </label>

          <label>
            Remote policy
            <select value={remotePolicy} onChange={(e) => setRemotePolicy(e.target.value)} style={remotePolicy ? activeStyle : {}}>
              <option value="">All</option>
              <option value="REMOTE_FRIENDLY">Remote-friendly</option>
              <option value="FLEXIBLE">Flexible</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On site</option>
            </select>
          </label>

          <label>
            Skill / engine / stack
            <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Unity, React, C++, gameplay" style={skill ? activeStyle : {}} />
          </label>

          <label>
            State / region
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="NC, North Carolina" style={state ? activeStyle : {}} />
          </label>

          <label>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Raleigh, Charlotte, Remote" style={location ? activeStyle : {}} />
          </label>

          <label>
            ATS / source
            <input value={ats} onChange={(e) => setAts(e.target.value)} placeholder="Greenhouse, Lever, Ashby" style={ats ? activeStyle : {}} />
          </label>

          <label>
            Company size
            <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="1-50, 51-200, 1000+" style={size ? activeStyle : {}} />
          </label>

          <label>
            Hiring now
            <select value={activeHiring} onChange={(e) => setActiveHiring(e.target.value)} style={activeHiring ? activeStyle : {}}>
              <option value="">All</option>
              <option value="true">Active hiring only</option>
            </select>
          </label>

          <label>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={sort ? activeStyle : {}}>
              <option value="">Hiring status</option>
              <option value="fit">Best fit score</option>
              <option value="jobs">Most open jobs</option>
              <option value="name">Company name (A–Z)</option>
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
