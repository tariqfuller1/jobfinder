"use client";

import { useState } from "react";
import type { GuessedEmail } from "@/lib/email-finder";

export function EmailGuesses({ emails }: { emails: GuessedEmail[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(email: string) {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopied(email);
    setTimeout(() => setCopied(null), 2000);
  }

  if (emails.length === 0) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        No emails found. The website may block scraping or have no public contact addresses.
      </p>
    );
  }

  const scraped = emails.filter((e) => !e.isGeneric && !e.contactName);
  const contactGuesses = emails.filter((e) => !e.isGeneric && !!e.contactName);
  const genericEmails = emails.filter((e) => e.isGeneric);
  const hasAI = genericEmails.some((e) => e.aiSuggested);

  return (
    <div style={{ display: "grid", gap: 12 }}>

      {/* Real emails scraped from the website */}
      {scraped.length > 0 && (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 11, color: "#34d399", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
            Found on website
            <span style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 4, fontSize: 10, padding: "1px 5px" }}>
              Real
            </span>
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {scraped.map((e) => (
              <EmailRow key={e.email} item={e} copied={copied} onCopy={copy} />
            ))}
          </div>
        </div>
      )}

      {/* Guessed emails from contact names + email pattern */}
      {contactGuesses.length > 0 && (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Contact guesses
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {contactGuesses.map((e) => (
              <EmailRow key={e.email} item={e} copied={copied} onCopy={copy} muted />
            ))}
          </div>
        </div>
      )}

      {/* Generic / AI-suggested dept. addresses */}
      {genericEmails.length > 0 && (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
            Dept. addresses
            {hasAI && (
              <span style={{ background: "rgba(225,29,72,0.12)", color: "#f87171", border: "1px solid rgba(225,29,72,0.2)", borderRadius: 4, fontSize: 10, padding: "1px 5px", fontWeight: 600 }}>
                AI
              </span>
            )}
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {genericEmails.map((e) => (
              <EmailRow key={e.email} item={e} copied={copied} onCopy={copy} muted />
            ))}
          </div>
        </div>
      )}

      <p className="muted" style={{ margin: 0, fontSize: 11, lineHeight: 1.5 }}>
        {scraped.length > 0
          ? "Green addresses were pulled from the company website. Others are guesses — verify before sending."
          : "No emails found on the website. Addresses below are guesses from pattern + AI rules."}
      </p>
    </div>
  );
}

function EmailRow({
  item,
  copied,
  onCopy,
  muted = false,
}: {
  item: GuessedEmail;
  copied: string | null;
  onCopy: (email: string) => void;
  muted?: boolean;
}) {
  const isCopied = copied === item.email;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: muted ? 400 : 500,
            color: muted ? "#9ca3af" : "#f5f5f5",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.email}
        </div>
        {item.contactName && (
          <div style={{ fontSize: 11, color: "#6b7280" }}>{item.contactName}</div>
        )}
        {!item.contactName && (
          <div style={{ fontSize: 11, color: "#6b7280" }}>{item.label}</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <a
          href={`mailto:${item.email}`}
          className="button secondary"
          style={{ fontSize: 11, minHeight: 28, padding: "4px 10px" }}
        >
          Open
        </a>
        <button
          type="button"
          onClick={() => onCopy(item.email)}
          className="button secondary"
          style={{ fontSize: 11, minHeight: 28, padding: "4px 10px" }}
        >
          {isCopied ? "✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
