const STATUS: Record<string, { label: string; color: string }> = {
  NEEDS_REVIEW: { label: "Ready for review", color: "#fbbf24" },
  QUEUED: { label: "Queued to submit", color: "#60a5fa" },
  SUBMITTING: { label: "Submitting…", color: "#60a5fa" },
  SUBMITTED: { label: "Submitted", color: "#4ade80" },
  NEEDS_MANUAL: { label: "Finish manually", color: "#f97316" },
  FAILED: { label: "Failed", color: "#f87171" },
  CANCELLED: { label: "Cancelled", color: "#6b7280" },
};

export function AutoApplyStatusBadge({ status }: { status: string }) {
  const { label, color } = STATUS[status] ?? { label: status, color: "#9ca3af" };
  return (
    <span
      className="badge"
      style={{ color, borderColor: `${color}44`, background: `${color}14`, whiteSpace: "nowrap" }}
    >
      {label}
    </span>
  );
}
