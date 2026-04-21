"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", icon: "◈" },
  { href: "/jobs", label: "Jobs", icon: "⌘" },
  { href: "/recommended", label: "Fit", icon: "◎" },
  { href: "/tracker", label: "Track", icon: "◌" },
  { href: "/profile", label: "Profile", icon: "◫" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-tab${active ? " active" : ""}`}
          >
            <span className="mobile-tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="mobile-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
