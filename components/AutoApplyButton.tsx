"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAutoApplyStatus, startAutoApply } from "@/app/actions/auto-apply";

type State = { id: string; status: string; error?: string | null };

const IN_FLIGHT = new Set(["QUEUED", "SUBMITTING"]);

export function AutoApplyButton({
  jobId,
  requireLogin = false,
  initial = null,
  compact = false,
}: {
  jobId: string;
  requireLogin?: boolean;
  initial?: State | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // While the worker has it, poll until it lands (Applied ✓ or needs the user).
  useEffect(() => {
    if (!state || !IN_FLIGHT.has(state.status)) return;
    const timer = setInterval(async () => {
      const next = await getAutoApplyStatus(state.id).catch(() => null);
      if (next && next.status !== state.status) {
        setState(next);
        if (!IN_FLIGHT.has(next.status)) router.refresh();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [state, router]);

  const size = compact
    ? { fontSize: 13, minHeight: 36, padding: "8px 14px" }
    : { width: "100%", justifyContent: "center" as const };
  const details = state && (
    <Link href={`/auto-apply/${state.id}`} className="muted" style={{ fontSize: 12, textDecoration: "underline" }}>
      details
    </Link>
  );

  function apply() {
    if (requireLogin) {
      router.push(`/login?next=/jobs/${jobId}`);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await startAutoApply(jobId);
      if (!result.ok) setError(result.error);
      // A question only the user can answer — take them to it.
      else if (result.status === "NEEDS_REVIEW") router.push(`/auto-apply/${result.id}`);
      else setState({ id: result.id, status: result.status });
    });
  }

  let control: React.ReactNode;
  if (state?.status === "SUBMITTED") {
    control = (
      <span className="button secondary" style={{ ...size, color: "#4ade80", borderColor: "rgba(74,222,128,0.3)", cursor: "default" }}>
        Applied ✓
      </span>
    );
  } else if (state && IN_FLIGHT.has(state.status)) {
    control = (
      <button className="button" disabled style={size}>
        <span className="btn-spinner" aria-hidden="true" /> Applying…
      </button>
    );
  } else if (state?.status === "NEEDS_REVIEW") {
    control = (
      <Link className="button" href={`/auto-apply/${state.id}`} style={size}>
        Finish review
      </Link>
    );
  } else if (state?.status === "NEEDS_MANUAL" || state?.status === "FAILED") {
    control = (
      <Link className="button secondary" href={`/auto-apply/${state.id}`} style={{ ...size, color: "#fb923c" }}>
        Needs you — finish it
      </Link>
    );
  } else {
    control = (
      <button className="button" onClick={apply} disabled={pending} style={size}>
        {pending ? (
          <>
            <span className="btn-spinner" aria-hidden="true" /> Filling it out…
          </>
        ) : (
          "Auto-apply"
        )}
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: compact ? "start" : "stretch" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {control}
        {compact && state && state.status !== "NEEDS_REVIEW" && details}
      </div>
      {!compact && pending && (
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Reading the form and answering it from your profile. This takes about 10–30 seconds.
        </p>
      )}
      {!compact && state && IN_FLIGHT.has(state.status) && (
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Submitting to the company's site — you can leave this page. {details}
        </p>
      )}
      {!compact && state && (state.status === "NEEDS_MANUAL" || state.status === "FAILED") && state.error && (
        <p style={{ margin: 0, fontSize: 12, color: "#fb923c" }}>{state.error}</p>
      )}
      {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171", maxWidth: 420 }}>{error}</p>}
    </div>
  );
}
