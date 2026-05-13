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
    return <p className="muted" style={{ margin: 0, fontSize: 12 }}>No domain info available to guess emails.</p>;
  }

  const contactEmails = emails.filter((e) => !e.isGeneric);
  const genericEmails = emails.filter((e) => e.isGeneric);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {contactEmails.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          {contactEmails.map((e) => (
            <EmailRow key={e.email} item={e} copied={copied} onCopy={copy} />
          ))}
        </div>
      )}

      {genericEmails.length > 0 && (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
            Dept. addresses
            {genericEmails.some((e) => e.aiSuggested) && (
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
        {contactEmails.length > 0
          ? "Contact addresses are guesses from the company pattern — verify before sending."
          : "Dept. addresses suggested by AI + pattern rules. Not verified; use as a starting point."}
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
        <div style={{ fontSize: 13, fontWeight: muted ? 400 : 500, color: muted ? "#9ca3af" : "#f5f5f5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.email}
        </div>
        {item.contactName && (
          <div style={{ fontSize: 11, color: "#6b7280" }}>{item.contactName}</div>
        )}
        {item.isGeneric && !item.contactName && (
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
