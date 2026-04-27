import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <div className="auth-shell">
      <section className="card stack auth-card">
        <div>
          <h1 className="section-title">Sign in</h1>
          {params.reset === "1" ? (
            <p style={{ color: "#4ade80", margin: 0, fontSize: 14 }}>Password updated — sign in with your new password.</p>
          ) : (
            <p className="muted">Welcome back.</p>
          )}
        </div>
        <AuthForm mode="login" />
        <div style={{ display: "flex", justifyContent: "space-between", margin: 0 }}>
          <p className="muted" style={{ margin: 0 }}>
            Need an account? <Link href="/register">Create one</Link>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
