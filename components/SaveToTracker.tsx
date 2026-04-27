"use client";

import { useState } from "react";

export function SaveToTracker({ jobId, userId }: { jobId: string; userId?: string | null }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (!userId) return null;

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "saved") {
    return <span className="button secondary" style={{ opacity: 0.6, cursor: "default" }}>Saved</span>;
  }

  return (
    <button className="button secondary" onClick={save} disabled={state === "saving"}>
      {state === "saving" ? "Saving…" : state === "error" ? "Error" : "Save"}
    </button>
  );
}
