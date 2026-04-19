"use client";

import { useRouter } from "next/navigation";

export function ApplyButton({ applyUrl, jobId, requireLogin = false }: { applyUrl: string; jobId: string; requireLogin?: boolean }) {
  const router = useRouter();

  const markApplied = async () => {
    if (requireLogin) {
      router.push(`/login?next=/jobs/${jobId}`);
      return;
    }

    const response = await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });

    if (response.status === 401) {
      router.push(`/login?next=/jobs/${jobId}`);
      return;
    }

    window.location.href = "/tracker";
  };

  return (
    <div className="actions">
      <a className="button" href={applyUrl} target="_blank" rel="noreferrer">
        Apply
      </a>
      <button className="button secondary" onClick={markApplied}>
        {requireLogin ? "Sign in to track" : "Mark as Applied"}
      </button>
    </div>
  );
}
