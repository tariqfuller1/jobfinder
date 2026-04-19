import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="auth-shell">
      <section className="card stack auth-card">
        <div>
          <h1 className="section-title">Create your account</h1>
          <p className="muted">
            Your account keeps your resume, job preferences, preferred locations, and personalized job-tailoring tools attached to your own profile.
          </p>
        </div>
        <AuthForm mode="register" />
        <p className="muted" style={{ margin: 0 }}>
          Already have an account? <Link href="/login">Sign in</Link>.
        </p>
      </section>
    </div>
  );
}
