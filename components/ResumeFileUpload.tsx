"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ResumeFileUpload({ fileName }: { fileName: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("resumeFile", file);
      const res = await fetch("/api/auto-apply/resume", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Upload failed.");
      else router.refresh();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="inset-card" style={{ padding: "10px 12px", fontSize: 13 }}>
        {fileName ? <>📎 {fileName}</> : <span style={{ color: "#f87171" }}>No resume file yet — most applications require one.</span>}
      </div>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <button className="button secondary" onClick={() => input.current?.click()} disabled={busy} style={{ justifySelf: "start" }}>
        {busy ? "Uploading…" : fileName ? "Replace resume (PDF or DOCX)" : "Upload resume (PDF or DOCX)"}
      </button>
      {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}
    </div>
  );
}
