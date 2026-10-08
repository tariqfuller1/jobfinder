"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAutoApply } from "@/app/actions/auto-apply";

export function AutoApplyButton({ jobId, requireLogin = false }: { jobId: string; requireLogin?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (requireLogin) {
      router.push(`/login?next=/jobs/${jobId}`);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await startAutoApply(jobId);
      if (result.ok) router.push(`/auto-apply/${result.id}`);
      else setError(result.error);
    });
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button className="button" onClick={handleClick} disabled={pending} style={{ width: "100%" }}>
        {pending ? (
          <>
            <span className="btn-spinner" aria-hidden="true" /> Filling out the application…
          </>
        ) : (
          "Auto-apply"
        )}
      </button>
      {pending && (
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Reading the form and drafting your answers. This takes about 10–30 seconds.
        </p>
      )}
      {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}
    </div>
  );
}
