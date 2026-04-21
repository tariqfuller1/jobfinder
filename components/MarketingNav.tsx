"use client";

import Link from "next/link";
import { useState } from "react";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="marketing-nav desktop-nav">
        <Link href="/jobs">Jobs</Link>
        <Link href="/companies">Companies</Link>
        <Link href="/login">Sign in</Link>
        <Link href="/register" className="button">Create account</Link>
      </nav>

      {/* Mobile hamburger */}
      <button
        className="mobile-hamburger"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <span className={`hamburger-bar${open ? " open" : ""}`} />
      </button>

      {/* Mobile menu overlay */}
      {open && (
        <div className="mobile-menu-overlay" onClick={close}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-brand">Job Finder</div>
            <Link href="/jobs" className="mobile-menu-link" onClick={close}>⌘ Jobs</Link>
            <Link href="/companies" className="mobile-menu-link" onClick={close}>▣ Companies</Link>
            <div className="mobile-menu-divider" />
            <Link href="/login" className="mobile-menu-link" onClick={close}>Sign in</Link>
            <Link href="/register" className="button" style={{ width: "100%", justifyContent: "center" }} onClick={close}>
              Create account
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
