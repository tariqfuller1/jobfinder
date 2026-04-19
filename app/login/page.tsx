import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="auth-shell">
      <section className="card stack auth-card">
        <div>
          <h1 className="section-title">Sign in</h1>
          <p className="muted">
            Sign in to save your resume, job preferences, cover letter drafts, and personalized resume rewrites to your account profile.
          </p>
        </div>
        <AuthForm mode="login" />
        <p className="muted" style={{ margin: 0 }}>
          Need an account? <Link href="/register">Create one here</Link>.
        </p>
      </section>
    </div>
  );
}
