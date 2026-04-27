"use client";

import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "SAVED", label: "Saved" },
  { value: "REACHING_OUT", label: "Reaching out" },
  { value: "APPLIED", label: "Applied" },
  { value: "RECRUITER_REACHED_OUT", label: "Recruiter reached out" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "GHOSTED", label: "Ghosted" },
];

const STATUS_ORDER: Record<string, number> = {
  SAVED: 0, REACHING_OUT: 1, APPLIED: 2,
  RECRUITER_REACHED_OUT: 3, INTERVIEW: 4,
  OFFER: 5, REJECTED: 6, GHOSTED: 7,
};

const STATUS_COLORS: Record<string, string> = {
  SAVED: "#6b7280",
  REACHING_OUT: "#3b82f6",
  APPLIED: "#8b5cf6",
  RECRUITER_REACHED_OUT: "#06b6d4",
  INTERVIEW: "#f59e0b",
  OFFER: "#22c55e",
  REJECTED: "#ef4444",
  GHOSTED: "#4b5563",
};

type Row = { id: string; company: string; roleTitle: string; applyUrl: string; status: string; dateApplied: string | null; followUpDate: string | null; notes: string | null; userReachedOut: boolean; companyReachedOut: boolean };
type SortKey = "company" | "roleTitle" | "status" | "dateApplied" | "followUpDate";
type SortDir = "asc" | "desc";

export function TrackerTable({ initialRows }: { initialRows: any[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: string | number = "", bv: string | number = "";
    if (sortKey === "status") { av = STATUS_ORDER[a.status] ?? 99; bv = STATUS_ORDER[b.status] ?? 99; }
    else if (sortKey === "dateApplied") { av = a.dateApplied ?? ""; bv = b.dateApplied ?? ""; }
    else if (sortKey === "followUpDate") { av = a.followUpDate ?? ""; bv = b.followUpDate ?? ""; }
    else { av = (a[sortKey] ?? "").toLowerCase(); bv = (b[sortKey] ?? "").toLowerCase(); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  async function updateRow(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/tracker/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated = await res.json();
    setRows((cur) => cur.map((r) => (r.id === id ? updated : r)));
  }

  async function removeRow(id: string) {
    await fetch(`/api/tracker/${id}`, { method: "DELETE" });
    setRows((cur) => cur.filter((r) => r.id !== id));
  }

  function SortHeader({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <th onClick={() => handleSort(col)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
        {label}{" "}
        <span style={{ opacity: active ? 1 : 0.3 }}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </th>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="inset-card" style={{ textAlign: "center", padding: "32px 16px" }}>
        <p style={{ margin: 0, color: "#6b7280" }}>No saved jobs yet. Hit <strong>Save</strong> on any job card to add it here.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <SortHeader col="company" label="Company" />
            <SortHeader col="roleTitle" label="Role" />
            <SortHeader col="status" label="Status" />
            <SortHeader col="dateApplied" label="Applied" />
            <th>You reached out</th>
            <th>They reached out</th>
            <SortHeader col="followUpDate" label="Follow up" />
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id}>
              <td style={{ fontWeight: 500 }}>{row.company}</td>
              <td>
                <a href={row.applyUrl} target="_blank" rel="noreferrer" style={{ color: "#d4d4d8" }}>
                  {row.roleTitle}
                </a>
              </td>
              <td>
                <select
                  value={row.status}
                  onChange={(e) => updateRow(row.id, { status: e.target.value })}
                  style={{ color: STATUS_COLORS[row.status] ?? "#d4d4d8", fontWeight: 600, fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 6px" }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </td>
              <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "#9ca3af" }}>
                {row.dateApplied ? new Date(row.dateApplied).toLocaleDateString() : "—"}
              </td>
              <td style={{ textAlign: "center" }}>
                <input type="checkbox" checked={row.userReachedOut} onChange={(e) => updateRow(row.id, { userReachedOut: e.target.checked })} />
              </td>
              <td style={{ textAlign: "center" }}>
                <input type="checkbox" checked={row.companyReachedOut} onChange={(e) => updateRow(row.id, { companyReachedOut: e.target.checked })} />
              </td>
              <td>
                <input
                  type="date"
                  defaultValue={row.followUpDate ? new Date(row.followUpDate).toISOString().slice(0, 10) : ""}
                  onBlur={(e) => updateRow(row.id, { followUpDate: e.target.value || null })}
                  style={{ fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 4px", color: "#d4d4d8" }}
                />
              </td>
              <td>
                <textarea
                  defaultValue={row.notes ?? ""}
                  onBlur={(e) => updateRow(row.id, { notes: e.target.value })}
                  placeholder="Notes…"
                  rows={1}
                  style={{ fontSize: 12, minWidth: 160, resize: "vertical" }}
                />
              </td>
              <td>
                <button
                  onClick={() => removeRow(row.id)}
                  title="Remove"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 16, padding: "2px 6px" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "#6b7280")}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
