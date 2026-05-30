"use client";

import { useState, useTransition } from "react";
import { sendSupport } from "@/app/actions/send-support";
import { SUPPORT_CATEGORIES } from "@/lib/support";

export default function SupportPage() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await sendSupport(formData);
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="stack page-stack-lg" style={{ padding: "60px 0", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36 }}>✓</div>
        <h1 className="section-title">Message sent</h1>
        <p className="muted">Thanks for reaching out. We'll look into it and get back to you if needed.</p>
      </div>
    );
  }

  return (
    <div className="stack page-stack-lg" style={{ padding: "40px 0 60px", maxWidth: 560, margin: "0 auto" }}>
      <div>
        <div className="eyebrow">Support</div>
        <h1 className="section-title">Get in touch</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Found a bug, have a suggestion, or just want to say something? Send it here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card stack" style={{ gap: 16, padding: 24 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Your email
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Category
          <select name="category" required>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Message
          <textarea
            name="message"
            required
            rows={6}
            placeholder="Describe the issue or suggestion in as much detail as you'd like…"
            style={{ resize: "vertical", fontSize: 13 }}
            minLength={10}
            maxLength={5000}
          />
        </label>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>
        )}

        <button type="submit" className="button" disabled={isPending} style={{ justifyContent: "center" }}>
          {isPending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
