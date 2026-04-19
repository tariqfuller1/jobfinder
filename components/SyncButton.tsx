"use client";

import { useEffect, useRef, useState } from "react";

type LogEntry =
  | { kind: "status"; message: string }
  | { kind: "start"; source: string; index: number; total: number; startedAt: number }
  | { kind: "source"; source: string; fetched: number; upserted: number; ok: boolean; error?: string; durationMs: number }
  | { kind: "done"; fetched: number; upserted: number; sources: number; failed: number }
  | { kind: "error"; message: string };

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [runningFetched, setRunningFetched] = useState(0);
  const [runningUpserted, setRunningUpserted] = useState(0);
  const [finished, setFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const sourceStartRef = useRef<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  function addLog(entry: LogEntry) {
    setLog((prev) => [...prev, entry]);
    scrollToBottom();
  }

  function startSync() {
    setSyncing(true);
    setFinished(false);
    setLog([]);
    setProgress(null);
    setCurrentSource(null);
    setRunningFetched(0);
    setRunningUpserted(0);
    setElapsedMs(0);
    sourceStartRef.current = {};

    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);

    const es = new EventSource("/api/sync/stream");

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "status") {
        addLog({ kind: "status", message: event.message });

      } else if (event.type === "start") {
        sourceStartRef.current[event.source] = Date.now();
        setCurrentSource(event.source);
        setProgress({ completed: event.index, total: event.total });

      } else if (event.type === "source") {
        const startedAt = sourceStartRef.current[event.source] ?? Date.now();
        const durationMs = Date.now() - startedAt;
        setCurrentSource(null);
        setProgress({ completed: event.completed, total: event.total });
        setRunningFetched(event.runningFetched);
        setRunningUpserted(event.runningUpserted);
        addLog({
          kind: "source",
          source: event.source,
          fetched: event.jobsFetched,
          upserted: event.jobsUpserted,
          ok: event.ok,
          error: event.error,
          durationMs,
        });

      } else if (event.type === "done") {
        if (timerRef.current) clearInterval(timerRef.current);
        addLog({
          kind: "done",
          fetched: event.totalFetched,
          upserted: event.totalUpserted,
          sources: event.totalSources,
          failed: event.failed,
        });
        setSyncing(false);
        setFinished(true);
        setCurrentSource(null);
        es.close();

      } else if (event.type === "error") {
        if (timerRef.current) clearInterval(timerRef.current);
        addLog({ kind: "error", message: event.message });
        setSyncing(false);
        setCurrentSource(null);
        es.close();
      }
    };

    es.onerror = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!finished) {
        addLog({ kind: "error", message: "Connection dropped. Sync may still be running server-side." });
      }
      setSyncing(false);
      setCurrentSource(null);
      es.close();
    };
  }

  const pct = progress ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="stack compact-stack">

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="button" onClick={startSync} disabled={syncing}>
          {syncing ? "Syncing…" : finished ? "Sync again" : "Sync jobs now"}
        </button>

        {syncing && (
          <span className="muted" style={{ fontSize: 13 }}>
            {progress
              ? `${progress.completed} / ${progress.total} sources`
              : "Starting…"}
            {" · "}
            {fmtElapsed(elapsedMs)} elapsed
          </span>
        )}

        {finished && !syncing && (
          <span style={{ fontSize: 13, color: "#4ade80" }}>
            Sync complete · {fmtElapsed(elapsedMs)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {(syncing || finished) && progress && (
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #ff3368, #d11a47)",
            borderRadius: 8,
            transition: "width 0.3s ease",
          }} />
        </div>
      )}

      {/* Running totals bar — shown while syncing */}
      {syncing && (runningFetched > 0 || runningUpserted > 0) && (
        <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
          <span>
            <span style={{ color: "#d4d4d8", fontWeight: 600 }}>{runningFetched.toLocaleString()}</span>
            <span className="muted"> fetched so far</span>
          </span>
          <span>
            <span style={{ color: "#4ade80", fontWeight: 600 }}>{runningUpserted.toLocaleString()}</span>
            <span className="muted"> new jobs</span>
          </span>
        </div>
      )}

      {/* Currently active source */}
      {syncing && currentSource && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "rgba(255,51,104,0.08)",
          border: "1px solid rgba(255,51,104,0.2)",
          borderRadius: 8,
          fontSize: 12,
        }}>
          <span style={{ color: "#ff3368", animation: "pulse 1.2s ease-in-out infinite" }}>●</span>
          <span className="muted">Fetching</span>
          <span style={{ color: "#d4d4d8", fontFamily: "monospace", fontWeight: 600 }}>{currentSource}</span>
        </div>
      )}

      {/* Live log */}
      {log.length > 0 && (
        <div
          ref={logRef}
          style={{
            maxHeight: 340,
            overflowY: "auto",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {log.map((entry, i) => {
            if (entry.kind === "status") {
              return (
                <div key={i} style={{ fontSize: 12, color: "#8b8b95", display: "flex", gap: 6 }}>
                  <span>→</span>
                  <span>{entry.message}</span>
                </div>
              );
            }

            if (entry.kind === "source") {
              return (
                <div key={i} style={{ fontSize: 12, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ color: entry.ok ? "#4ade80" : "#f87171", flexShrink: 0 }}>
                    {entry.ok ? "✓" : "✗"}
                  </span>
                  <span style={{
                    color: "#d4d4d8",
                    fontFamily: "monospace",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {entry.source}
                  </span>
                  <span style={{ color: "#6b7280", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {entry.ok
                      ? `${entry.fetched} fetched · ${entry.upserted} new · ${fmtDuration(entry.durationMs)}`
                      : (entry.error ?? "failed")}
                  </span>
                </div>
              );
            }

            if (entry.kind === "done") {
              return (
                <div key={i} style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  <span style={{ color: "#4ade80" }}>Done</span>
                  <span style={{ color: "#d4d4d8" }}>
                    {entry.sources} sources · {entry.fetched.toLocaleString()} fetched · {entry.upserted.toLocaleString()} new
                    {entry.failed > 0 ? ` · ${entry.failed} failed` : ""}
                  </span>
                </div>
              );
            }

            if (entry.kind === "error") {
              return (
                <div key={i} style={{ fontSize: 12, color: "#f87171", display: "flex", gap: 6 }}>
                  <span>✗</span>
                  <span>{entry.message}</span>
                </div>
              );
            }
          })}

          {syncing && !currentSource && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>●</span>
              {" "}waiting for next source…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
