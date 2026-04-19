"use client";

import { useState } from "react";

const statuses = ["SAVED", "APPLIED", "REACHING_OUT", "RECRUITER_REACHED_OUT", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED"];

export function TrackerTable({ initialRows }: { initialRows: any[] }) {
  const [rows, setRows] = useState(initialRows);

  const updateRow = async (id: string, patch: Record<string, unknown>) => {
    const response = await fetch(`/api/tracker/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated = await response.json();
    setRows((current) => current.map((row) => (row.id === id ? updated : row)));
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Company</th>
          <th>Role</th>
          <th>Status</th>
          <th>Applied</th>
          <th>You reached out</th>
          <th>They reached out</th>
          <th>Follow up</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.company}</td>
            <td>
              <a href={row.applyUrl} target="_blank" rel="noreferrer">
                {row.roleTitle}
              </a>
            </td>
            <td>
              <select value={row.status} onChange={(e) => updateRow(row.id, { status: e.target.value })}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </td>
            <td>{row.dateApplied ? new Date(row.dateApplied).toLocaleDateString() : "—"}</td>
            <td>
              <input
                type="checkbox"
                checked={row.userReachedOut}
                onChange={(e) => updateRow(row.id, { userReachedOut: e.target.checked })}
              />
            </td>
            <td>
              <input
                type="checkbox"
                checked={row.companyReachedOut}
                onChange={(e) => updateRow(row.id, { companyReachedOut: e.target.checked })}
              />
            </td>
            <td>
              <input
                type="date"
                defaultValue={row.followUpDate ? new Date(row.followUpDate).toISOString().slice(0, 10) : ""}
                onBlur={(e) => updateRow(row.id, { followUpDate: e.target.value || null })}
              />
            </td>
            <td>
              <textarea defaultValue={row.notes ?? ""} onBlur={(e) => updateRow(row.id, { notes: e.target.value })} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
