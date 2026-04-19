import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Job Finder",
  description: "Aggregate jobs, track applications, and build targeted outreach.",
};

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/jobs", label: "Jobs", icon: "⌘" },
  { href: "/recommended", label: "Best fit", icon: "◎" },
  { href: "/profile", label: "Profile", icon: "◫" },
  { href: "/tracker", label: "Tracker", icon: "◌" },
];

const creatorNav = [
  { href: "/cover-letters", label: "Cover letters", icon: "✦" },
  { href: "/resume-feedback", label: "Resume tips", icon: "△" },
  { href: "/resume-rewrite", label: "Resume rewriter", icon: "✎" },
];

const companyNav = [
  { href: "/companies", label: "Companies", icon: "▣" },
  { href: "/companies/import", label: "Import companies", icon: "+" },
];

function RailLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="rail-link">
      <span className="rail-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <div className="marketing-shell">
            <header className="marketing-topbar">
              <div className="container marketing-topbar-card">
                <Link href="/" className="brand brand-large">Job Finder</Link>
                <nav className="marketing-nav">
                  <Link href="/jobs">Jobs</Link>
                  <Link href="/companies">Companies</Link>
                  <Link href="/login">Sign in</Link>
                  <Link href="/register" className="button">Create account</Link>
                </nav>
              </div>
            </header>
            <main className="container marketing-main">{children}</main>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="app-shell">
          <aside className="app-rail">
            <div className="rail-brand card hero-card">
              <Link href="/dashboard" className="brand brand-large">Job Finder</Link>
              <p className="muted rail-copy">
                Job search, resume tailoring, company research, and outreach tools in one workspace.
              </p>
            </div>

            <div className="rail-section">
              <div className="rail-section-label">Workspace</div>
              <nav className="rail-nav">
                {primaryNav.map((item) => (
                  <RailLink key={item.href} {...item} />
                ))}
              </nav>
            </div>

            <div className="rail-section">
              <div className="rail-section-label">Tailoring tools</div>
              <nav className="rail-nav">
                {creatorNav.map((item) => (
                  <RailLink key={item.href} {...item} />
                ))}
              </nav>
            </div>

            <div className="rail-section">
              <div className="rail-section-label">Company research</div>
              <nav className="rail-nav">
                {companyNav.map((item) => (
                  <RailLink key={item.href} {...item} />
                ))}
              </nav>
            </div>

            <div className="rail-spotlight card">
              <div className="rail-stat-label">Built for</div>
              <div className="rail-stat-value">Fast targeting</div>
              <p className="muted rail-copy" style={{ marginTop: 8 }}>
                Save one profile, generate job-specific materials, and move from discovery to application faster.
              </p>
            </div>
          </aside>

          <div className="app-stage">
            <header className="topbar">
              <div className="topbar-card">
                <div>
                  <div className="eyebrow">Modern job search workspace</div>
                  <div className="topbar-title">Your signed-in job search workspace</div>
                </div>
                <div className="topbar-actions">
                  {user ? (
                    <>
                      <div className="topbar-user card inset-card">
                        <div className="rail-section-label">Signed in</div>
                        <strong>{user.displayName || user.email}</strong>
                      </div>
                      <Link href="/profile" className="button secondary">Profile settings</Link>
                      <LogoutButton />
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="button secondary">Sign in</Link>
                      <Link href="/register" className="button">Create account</Link>
                    </>
                  )}
                </div>
              </div>
            </header>
            <main className="app-main container">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
