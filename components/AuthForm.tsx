"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not complete that action.");
      }
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete that action.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="stack compact-stack" onSubmit={handleSubmit}>
      {mode === "register" ? (
        <label>
          Name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
            required
          />
        </label>
      ) : null}

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
        />
      </label>

      {mode === "register" ? (
        <label>
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            required
            minLength={8}
          />
        </label>
      ) : null}

      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}

      <div className="actions">
        <button className="button" type="submit" disabled={isLoading}>
          {isLoading ? (mode === "login" ? "Signing in..." : "Creating account...") : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </div>
    </form>
  );
}
