"use client";

import { useMemo, useState } from "react";

export function CoverLetterEditor({
  initialValue,
  fileName,
}: {
  initialValue: string;
  fileName: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => {
    return value.trim() ? value.trim().split(/\s+/).length : 0;
  }, [value]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadTextFile = () => {
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack compact-stack">
      <div className="space-between">
        <p className="muted" style={{ margin: 0 }}>
          Edit the draft before sending. Aim for one page and keep the strongest details near the top.
        </p>
        <span className="badge">{wordCount} words</span>
      </div>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={22}
        className="letter-textarea"
      />

      <div className="actions">
        <button type="button" className="button" onClick={copyToClipboard}>
          {copied ? "Copied" : "Copy letter"}
        </button>
        <button type="button" className="button secondary" onClick={downloadTextFile}>
          Download .txt
        </button>
        <button type="button" className="button secondary" onClick={() => setValue(initialValue)}>
          Reset draft
        </button>
      </div>
    </div>
  );
}
