"use client";

import { useState } from "react";

export function SidebarToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="sidebar-mobile-toggle button secondary"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕ Hide filters" : "⊞ Filters"}
      </button>
      <div className={`sidebar-mobile-body${open ? " is-open" : ""}`}>
        {children}
      </div>
    </>
  );
}
