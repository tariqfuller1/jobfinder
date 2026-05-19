import Link from "next/link";

export default function NotFound() {
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
      <div style={{ fontSize: 56, fontWeight: 900, color: "#ff3368", letterSpacing: "-0.05em", lineHeight: 1 }}>
        404
      </div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f5f5f5", margin: 0 }}>
        Page not found
      </h1>
      <p className="muted" style={{ maxWidth: 380, margin: 0 }}>
        This page doesn&apos;t exist or may have moved.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <Link className="button" href="/jobs">
          Browse jobs
        </Link>
        <Link className="button secondary" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
