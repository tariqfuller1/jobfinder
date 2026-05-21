"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function JobsAutoRefresh() {
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const since = useRef(new Date().toISOString());

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/api/jobs?since=${encodeURIComponent(since.current)}&limit=1`);
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.total === "number" && data.total > 0) {
          setNewCount(data.total);
        }
      } catch {
        // ignore network errors silently
      }
    };

    const id = setInterval(check, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (newCount === 0) return null;

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "linear-gradient(135deg, rgba(99,102,241,0.97), rgba(79,70,229,0.97))",
      backdropFilter: "blur(8px)",
      padding: "11px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>
        {newCount} new job{newCount !== 1 ? "s" : ""} just synced
      </span>
      <button
        onClick={() => {
          setIsRefreshing(true);
          since.current = new Date().toISOString();
          setNewCount(0);
          router.refresh();
        }}
        style={{
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.35)",
          borderRadius: 6,
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          padding: "5px 14px",
          cursor: "pointer",
          letterSpacing: "0.02em",
        }}
      >
        {isRefreshing ? "Refreshing…" : "Show new jobs"}
      </button>
      <button
        onClick={() => setNewCount(0)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
          padding: "0 2px",
        }}
      >
        ×
      </button>
    </div>
  );
}
