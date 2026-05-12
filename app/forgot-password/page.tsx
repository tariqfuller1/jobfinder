"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <section className="card stack auth-card" style={{ padding: "32px 28px" }}>
          <div style={{ fontSize: 36, textAlign: "center" }}>✉️</div>
          <div>
            <h1 className="section-title">Check your email</h1>
            <p className="muted">
              If <strong style={{ color: "#f5f5f5" }}>{email}</strong> has an account, we sent a
              password reset link to that address. It expires in 1 hour.
            </p>
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              Don't see it? Check your spam folder, or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#ff3368", padding: 0, fontSize: 13 }}
              >
                try again
              </button>
              .
            </p>
          </div>
          <Link href="/login" className="button secondary" style={{ textAlign: "center", justifyContent: "center" }}>
            Back to sign in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="card stack auth-card">
        <div>
          <h1 className="section-title">Forgot password</h1>
          <p className="muted">Enter your email and we'll send you a reset link.</p>
        </div>
        <form onSubmit={submit} className="stack compact-stack">
          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171",
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </label>
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="muted" style={{ margin: 0 }}>
          Remembered it? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
