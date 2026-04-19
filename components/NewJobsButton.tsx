"use client";

import { useEffect, useRef, useState } from "react";
import { JobCard, type JobCardData } from "@/components/JobCard";

type LogEntry =
  | { kind: "status"; message: string }
  | { kind: "start"; source: string; index: number; total: number }
  | { kind: "source"; source: string; fetched: number; upserted: number; ok: boolean; error?: string; durationMs: number }
  | { kind: "done"; fetched: number; upserted: number; sources: number; failed: number }
  | { kind: "error"; message: string };

type Phase = "idle" | "syncing" | "loading" | "done";

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

type Props = {
  sinceLastSync: string;
  filters?: {
    q?: string;
    workplaceType?: string;
    employmentType?: string;
    experienceLevel?: string;
    location?: string;
    source?: string;
    company?: string;
  };
  userId?: string | null;
};

export function NewJobsButton({ sinceLastSync, filters = {}, userId }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [runningFetched, setRunningFetched] = useState(0);
  const [runningUpserted, setRunningUpserted] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [estRemainingMs, setEstRemainingMs] = useState<number | null>(null);
  const [newJobs, setNewJobs] = useState<JobCardData[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Refs — mutable values that shouldn't trigger re-renders
  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const sourceStartRef = useRef<Record<string, number>>({});
  const completedDurationsRef = useRef<number[]>([]);
  // Keep a live copy of progress for the interval callback (avoids stale closure)
  const progressRef = useRef<{ completed: number; total: number } | null>(null);
  // Cursor for the new-jobs fetch advances with each update run
  const cursorRef = useRef<string>(sinceLastSync);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function scrollLog() {
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  function addLog(entry: LogEntry) {
    setLog((prev) => [...prev, entry]);
    scrollLog();
  }

  function startUpdate() {
    // Reset state
    setPhase("syncing");
    setLog([]);
    setProgress(null);
    setCurrentSource(null);
    setRunningFetched(0);
    setRunningUpserted(0);
    setElapsedMs(0);
    setEstRemainingMs(null);
    sourceStartRef.current = {};
    completedDurationsRef.current = [];
    progressRef.current = null;

    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);

    // Elapsed + estimated remaining ticker (every 500ms)
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);

      // Estimate remaining: avg duration per completed source × remaining sources
      const durations = completedDurationsRef.current;
      const prog = progressRef.current;
      if (durations.length > 0 && prog && prog.completed > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const remaining = (prog.total - prog.completed) * avg;
        setEstRemainingMs(remaining > 0 ? remaining : null);
      }
    }, 500);

    const syncStart = Date.now();
    const es = new EventSource("/api/sync/stream");

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "status") {
        addLog({ kind: "status", message: event.message });

      } else if (event.type === "start") {
        sourceStartRef.current[event.source] = Date.now();
        setCurrentSource(event.source);
        progressRef.current = { completed: event.index, total: event.total };
        setProgress({ completed: event.index, total: event.total });

      } else if (event.type === "source") {
        const startedAt = sourceStartRef.current[event.source] ?? Date.now();
        const durationMs = Date.now() - startedAt;
        completedDurationsRef.current.push(durationMs);

        setCurrentSource(null);
        progressRef.current = { completed: event.completed, total: event.total };
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
        setElapsedMs(Date.now() - startTimeRef.current);
        setEstRemainingMs(null);
        addLog({
          kind: "done",
          fetched: event.totalFetched,
          upserted: event.totalUpserted,
          sources: event.totalSources,
          failed: event.failed,
        });
        setCurrentSource(null);
        setPhase("loading");
        es.close();

        // Fetch new jobs added during this sync run
        const since = new Date(syncStart).toISOString();
        const params = new URLSearchParams({ since, limit: "50" });
        if (filters.q)               params.set("q", filters.q);
        if (filters.workplaceType)   params.set("workplaceType", filters.workplaceType);
        if (filters.employmentType)  params.set("employmentType", filters.employmentType);
        if (filters.experienceLevel) params.set("experienceLevel", filters.experienceLevel);
        if (filters.location)        params.set("location", filters.location);
        if (filters.source)          params.set("source", filters.source);
        if (filters.company)         params.set("company", filters.company);

        fetch(`/api/jobs?${params}`)
          .then((r) => r.json())
          .then((data) => {
            const fresh: JobCardData[] = data.jobs ?? [];
            if (fresh.length > 0) {
              setNewJobs((prev) => {
                const existingIds = new Set(prev.map((j) => j.id));
                const deduped = fresh.filter((j) => !existingIds.has(j.id));
                return [...deduped, ...prev];
              });
              setExpanded(true);
              // Advance cursor so next run only picks up truly new jobs
              cursorRef.current = new Date().toISOString();
            }
            setPhase("done");
          })
          .catch(() => setPhase("done"));

      } else if (event.type === "error") {
        if (timerRef.current) clearInterval(timerRef.current);
        addLog({ kind: "error", message: event.message });
        setCurrentSource(null);
        setPhase("done");
        es.close();
      }
    };

    es.onerror = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      addLog({ kind: "error", message: "Connection dropped. Sync may still be running server-side." });
      setCurrentSource(null);
      setPhase("done");
      es.close();
    };
  }

  const syncing = phase === "syncing";
  const loading = phase === "loading";
  const busy = syncing || loading;
  const done = phase === "done";
  const pct = progress ? Math.round((progress.completed / progress.total) * 100) : 0;
  const totalNew = newJobs.length;

  return (
    <div className="stack compact-stack" style={{ marginBottom: 4 }}>

      {/* ── Controls row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          className="button secondary"
          onClick={startUpdate}
          disabled={busy}
          style={{ fontSize: 13, minHeight: 34 }}
        >
          {syncing ? "Syncing…" : loading ? "Loading new jobs…" : done ? "↻ Update again" : "↻ Update jobs"}
        </button>

        {/* Elapsed + estimated remaining */}
        {syncing && (
          <span className="muted" style={{ fontSize: 13 }}>
            {progress
              ? `Source ${progress.completed} of ${progress.total}`
              : "Starting…"}
            {" · "}
            {fmtTime(elapsedMs)} elapsed
            {estRemainingMs != null && (
              <span style={{ color: "#fbbf24" }}>{" · "}~{fmtTime(estRemainingMs)} left</span>
            )}
          </span>
        )}

        {done && totalNew > 0 && (
          <span style={{ fontSize: 13, color: "#4ade80" }}>
            {totalNew} new job{totalNew !== 1 ? "s" : ""} found · {fmtTime(elapsedMs)}
          </span>
        )}
        {done && totalNew === 0 && (
          <span className="muted" style={{ fontSize: 13 }}>
            No new jobs · {fmtTime(elapsedMs)}
          </span>
        )}
      </div>

      {/* ── Progress bar ── */}
      {(syncing || done) && progress && (
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: syncing
              ? "linear-gradient(90deg, #ff3368, #d11a47)"
              : "linear-gradient(90deg, #4ade80, #22c55e)",
            borderRadius: 8,
            transition: "width 0.35s ease",
          }} />
        </div>
      )}

      {/* ── Running totals ── */}
      {syncing && (runningFetched > 0 || runningUpserted > 0) && (
        <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
          <span>
            <span style={{ color: "#d4d4d8", fontWeight: 600 }}>{runningFetched.toLocaleString()}</span>
            <span className="muted"> fetched</span>
          </span>
          <span>
            <span style={{ color: "#4ade80", fontWeight: 600 }}>{runningUpserted.toLocaleString()}</span>
            <span className="muted"> new jobs saved</span>
          </span>
        </div>
      )}

      {/* ── Active source indicator ── */}
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
          <span style={{ color: "#ff3368" }}>●</span>
          <span className="muted">Fetching</span>
          <span style={{ color: "#d4d4d8", fontFamily: "monospace", fontWeight: 600 }}>{currentSource}</span>
        </div>
      )}

      {/* ── Scrollable log ── */}
      {log.length > 0 && (
        <div
          ref={logRef}
          style={{
            maxHeight: 280,
            overflowY: "auto",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {log.map((entry, i) => {
            if (entry.kind === "status") return (
              <div key={i} style={{ fontSize: 12, color: "#8b8b95", display: "flex", gap: 6 }}>
                <span>→</span><span>{entry.message}</span>
              </div>
            );

            if (entry.kind === "source") return (
              <div key={i} style={{ fontSize: 12, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: entry.ok ? "#4ade80" : "#f87171", flexShrink: 0 }}>
                  {entry.ok ? "✓" : "✗"}
                </span>
                <span style={{
                  color: "#d4d4d8", fontFamily: "monospace",
                  flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
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

            if (entry.kind === "done") return (
              <div key={i} style={{
                marginTop: 6, paddingTop: 6,
                borderTop: "1px solid rgba(255,255,255,0.1)",
                fontSize: 13, fontWeight: 600,
                display: "flex", flexWrap: "wrap", gap: 10,
              }}>
                <span style={{ color: "#4ade80" }}>Done</span>
                <span style={{ color: "#d4d4d8" }}>
                  {entry.sources} sources · {entry.fetched.toLocaleString()} fetched · {entry.upserted.toLocaleString()} new
                  {entry.failed > 0 ? ` · ${entry.failed} failed` : ""}
                </span>
              </div>
            );

            if (entry.kind === "error") return (
              <div key={i} style={{ fontSize: 12, color: "#f87171", display: "flex", gap: 6 }}>
                <span>✗</span><span>{entry.message}</span>
              </div>
            );
          })}

          {syncing && !currentSource && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              <span>●</span>{" "}waiting for next source…
            </div>
          )}
        </div>
      )}

      {/* ── New jobs found ── */}
      {totalNew > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 16px", borderRadius: 8,
          background: "linear-gradient(135deg, rgba(74,222,128,0.1), rgba(34,197,94,0.06))",
          border: "1px solid rgba(74,222,128,0.22)",
          fontSize: 13,
        }}>
          <span style={{ color: "#4ade80", fontWeight: 700 }}>
            {totalNew} new job{totalNew !== 1 ? "s" : ""} added
          </span>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none", border: "none", color: "#6b7280",
              cursor: "pointer", fontSize: 13, padding: 0, textDecoration: "underline",
            }}
          >
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
      )}

      {expanded && totalNew > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {newJobs.map((job) => (
            <JobCard key={job.id} job={job} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
