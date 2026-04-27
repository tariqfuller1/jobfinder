"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);
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
      } else if (data.token) {
        setResetLink(`${window.location.origin}/reset-password/${data.token}`);
      } else {
        // Email not found — still show the same state so we don't leak user existence
        setResetLink("not-found");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (resetLink && resetLink !== "not-found") {
    return (
      <div className="auth-shell">
        <section className="card stack auth-card">
          <div>
            <h1 className="section-title">Reset your password</h1>
            <p className="muted">Copy this link to reset your password. It expires in 1 hour.</p>
          </div>
          <div className="inset-card" style={{ wordBreak: "break-all", fontSize: 13 }}>
            <a href={resetLink}>{resetLink}</a>
          </div>
          <Link href="/login" className="button" style={{ textAlign: "center" }}>Back to sign in</Link>
        </section>
      </div>
    );
  }

  if (resetLink === "not-found") {
    return (
      <div className="auth-shell">
        <section className="card stack auth-card">
          <div>
            <h1 className="section-title">Check your email</h1>
            <p className="muted">If that email has an account, a reset link has been generated.</p>
          </div>
          <Link href="/login" className="button" style={{ textAlign: "center" }}>Back to sign in</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="card stack auth-card">
        <div>
          <h1 className="section-title">Forgot password</h1>
          <p className="muted">Enter your email and we'll generate a reset link.</p>
        </div>
        <form onSubmit={submit} className="stack compact-stack">
          {error && <p style={{ color: "#f87171", margin: 0, fontSize: 14 }}>{error}</p>}
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
            {loading ? "Generating…" : "Get reset link"}
          </button>
        </form>
        <p className="muted" style={{ margin: 0 }}>
          Remembered it? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
