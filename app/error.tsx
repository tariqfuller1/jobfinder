"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in production; swap for your error-tracking service if needed
    console.error("[app-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: "40px 20px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 40, opacity: 0.4 }}>⚠</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f5f5f5", margin: 0 }}>
        Something went wrong
      </h1>
      <p className="muted" style={{ maxWidth: 420, margin: 0 }}>
        We hit an unexpected error. If this keeps happening, try signing out and back in.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="button secondary" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
