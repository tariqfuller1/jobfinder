"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({ placeholder = "Search..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(sp.get("q") ?? "");

  function submit() {
    const params = new URLSearchParams(sp.toString());
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        style={{ flex: 1, fontSize: 15, padding: "10px 14px" }}
      />
      <button className="button" onClick={submit} style={{ whiteSpace: "nowrap" }}>
        Search
      </button>
      {sp.get("q") && (
        <button
          className="button secondary"
          onClick={() => {
            setValue("");
            const params = new URLSearchParams(sp.toString());
            params.delete("q");
            params.delete("page");
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
