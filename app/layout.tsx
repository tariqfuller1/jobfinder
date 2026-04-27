import "./globals.css";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { MarketingNav } from "@/components/MarketingNav";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "Hyrd",
  description: "Find jobs, tailor your resume, and track applications in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
                <Link href="/" className="brand brand-large">Hyrd</Link>
                <MarketingNav />
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
              <Link href="/dashboard" className="brand brand-large">Hyrd</Link>
              <p className="muted rail-copy">
                Jobs, resume tools, and company research in one place.
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
                One profile. Tailored cover letters, tips, and rewrites for every role.
              </p>
            </div>
          </aside>

          <div className="app-stage">
            <header className="topbar">
              <div className="topbar-card">
                {/* Mobile: simple brand + logout */}
                <div className="topbar-mobile-brand">
                  <Link href="/dashboard" className="brand">Hyrd</Link>
                </div>
                {/* Desktop: full title */}
                <div className="topbar-desktop-title">
                  <div className="eyebrow">Modern job search workspace</div>
                  <div className="topbar-title">Your job search workspace</div>
                </div>
                <div className="topbar-actions">
                  {user ? (
                    <>
                      <div className="topbar-user card inset-card">
                        <div className="rail-section-label">Signed in</div>
                        <strong>{user.displayName || user.email}</strong>
                      </div>
                      <Link href="/profile" className="button secondary topbar-profile-btn">Profile settings</Link>
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
            <MobileBottomNav />
          </div>
        </div>
      </body>
    </html>
  );
}
