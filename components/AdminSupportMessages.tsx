"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSupportMessageRead, deleteSupportMessage } from "@/app/actions/admin-support";
import { SUPPORT_CATEGORIES } from "@/lib/support";

type Message = {
  id: string;
  email: string;
  category: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
};

const CATEGORY_COLORS: Record<string, string> = {
  "Bug report": "#f87171",
  "Feature request": "#a5b4fc",
  "General question": "#4ade80",
  "Other": "#9ca3af",
};

type SortKey = "newest" | "oldest" | "category";
type ReadFilter = "all" | "unread" | "read";

function fmt(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

export function AdminSupportMessages({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [isMarking, startMark] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [sort, setSort] = useState<SortKey>("newest");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { filtered, unreadCount } = useMemo(() => {
    const unreadCount = messages.filter((m) => !m.read).length;
    let list = [...messages];
    if (readFilter === "unread") list = list.filter((m) => !m.read);
    else if (readFilter === "read") list = list.filter((m) => m.read);
    if (categoryFilter !== "all") list = list.filter((m) => m.category === categoryFilter);
    if (sort === "newest") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === "oldest") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sort === "category") list.sort((a, b) => a.category.localeCompare(b.category));
    return { filtered: list, unreadCount };
  }, [messages, sort, readFilter, categoryFilter]);

  function handleMarkRead(id: string, read: boolean) {
    startMark(async () => {
      await markSupportMessageRead(id, read);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      await deleteSupportMessage(id);
      router.refresh();
    });
  }

  return (
    <section className="stack">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#d4d4d8", margin: 0 }}>Support messages</h2>
        {unreadCount > 0 && (
          <span style={{ background: "#f87171", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 8px" }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>No messages yet.</p>
      ) : (
        <>
          {/* Controls */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
              style={{ fontSize: 12, padding: "5px 8px" }}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ fontSize: 12, padding: "5px 8px" }}
            >
              <option value="all">All categories</option>
              {SUPPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              style={{ fontSize: 12, padding: "5px 8px" }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="category">By category</option>
            </select>
            {filtered.length !== messages.length && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                Showing {filtered.length} of {messages.length}
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>No messages match your filters.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {filtered.map((msg) => (
                <div key={msg.id} className="card" style={{ padding: "16px 20px", opacity: msg.read ? 0.55 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 9px",
                        background: `${CATEGORY_COLORS[msg.category] ?? "#9ca3af"}22`,
                        color: CATEGORY_COLORS[msg.category] ?? "#9ca3af",
                      }}>
                        {msg.category}
                      </span>
                      {!msg.read && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#facc15", letterSpacing: "0.05em" }}>NEW</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{fmt(msg.createdAt)}</span>
                      <button
                        onClick={() => handleMarkRead(msg.id, !msg.read)}
                        disabled={isMarking}
                        style={{
                          fontSize: 11, padding: "3px 9px", cursor: "pointer",
                          borderRadius: 6, border: "1px solid var(--border)",
                          background: "transparent", color: "#9ca3af",
                        }}
                      >
                        {msg.read ? "Mark unread" : "Mark read"}
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        disabled={isDeleting}
                        style={{
                          fontSize: 11, padding: "3px 9px", cursor: "pointer",
                          borderRadius: 6, border: "1px solid rgba(248,113,113,0.3)",
                          background: "transparent", color: "#f87171",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.message}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>From: {msg.email}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
