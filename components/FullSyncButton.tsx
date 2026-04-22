"use client";

import { useEffect, useState } from "react";

type Status = { running: boolean; fetched: number; upserted: number; sources: number; totalSources: number; done: boolean; error: string };

export function FullSyncButton({ userId }: { userId?: string | null }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [triggered, setTriggered] = useState(false);

  // Poll status every 5 seconds while running
  useEffect(() => {
    if (!triggered) return;
    const id = setInterval(async () => {
      const res = await fetch("/api/sync/background");
      const data = await res.json();
      setStatus(data);
      if (!data.running && data.done) clearInterval(id);
    }, 5000);
    return () => clearInterval(id);
  }, [triggered]);

  async function start() {
    setTriggered(true);
    const res = await fetch("/api/sync/background", { method: "POST" });
    const data = await res.json();
    setStatus(data);
  }

  const running = status?.running ?? false;
  const done = status?.done ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          className="button secondary"
          onClick={start}
          disabled={running}
          style={{ fontSize: 13, minHeight: 34 }}
        >
          {running ? "⟳ Full sync running…" : done ? "✓ Full sync complete — refresh page" : "⬇ Full sync (all sources)"}
        </button>

        {running && status && (
          <span className="muted" style={{ fontSize: 13 }}>
            {status.sources > 0
              ? `${status.sources}${status.totalSources > 0 ? `/${status.totalSources}` : ""} sources · ${status.upserted.toLocaleString()} new jobs`
              : "Discovering sources…"}
          </span>
        )}

        {done && status && (
          <span style={{ fontSize: 13, color: "#4ade80" }}>
            {status.upserted.toLocaleString()} new jobs added
          </span>
        )}

        {status?.error && (
          <span style={{ fontSize: 13, color: "#f87171" }}>{status.error}</span>
        )}
      </div>

      {running && (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Running in background — you can navigate away. Refresh this page every few minutes to see new jobs appear.
        </p>
      )}
    </div>
  );
}
