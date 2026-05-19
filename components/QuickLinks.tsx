"use client";

import { useState } from "react";

type Link = { label: string; url: string };

function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}

function CopyBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      title="Copy URL"
      style={{
        background: "none",
        border: "1px solid rgba(255,255,255,0.1)",
        borderLeft: "none",
        borderRadius: "0 10px 10px 0",
        cursor: "pointer",
        color: copied ? "#4ade80" : "#6b7280",
        fontSize: 12,
        padding: "0 10px",
        height: "100%",
        transition: "color 0.15s",
      }}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

export function QuickLinks({ links }: { links: Link[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {links.map((link, i) => (
        <div key={i} style={{ display: "flex", height: 40 }}>
          <a
            href={safeHref(link.url)}
            target="_blank"
            rel="noreferrer"
            className="button secondary"
            style={{
              fontSize: 13,
              borderRadius: "10px 0 0 10px",
              borderRight: "none",
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            {link.label}
          </a>
          <CopyBtn url={link.url} />
        </div>
      ))}
    </div>
  );
}
