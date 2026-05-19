import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { SaveToTracker } from "@/components/SaveToTracker";
import { getRoleCategory } from "@/lib/classify";
import { stripHtml } from "@/lib/normalize";

export type JobCardData = {
  id: string;
  title: string;
  company: string;
  companySlug?: string | null;
  location?: string | null;
  workplaceType: string;
  employmentType: string;
  experienceLevel: string;
  companyCategory?: string | null;
  roleCategory?: string | null;
  fitScore: number;
  fitReasons: string[];
  tags?: string[];
  salary?: { label: string; basis: string } | null;
  descriptionText?: string | null;
  postedAt?: string | Date | null;
  hasReliableApplyLink?: boolean;
};

function fmtWorkplace(v: string) {
  if (v === "REMOTE") return "Remote";
  if (v === "HYBRID") return "Hybrid";
  if (v === "ONSITE") return "On-site";
  return null;
}
function fmtEmployment(v: string) {
  if (v === "FULL_TIME") return "Full-time";
  if (v === "PART_TIME") return "Part-time";
  if (v === "INTERNSHIP") return "Internship";
  if (v === "CONTRACT") return "Contract";
  if (v === "TEMPORARY") return "Temporary";
  return null;
}
function fmtExperience(v: string) {
  if (v === "INTERN") return "Intern";
  if (v === "ENTRY") return "Entry";
  if (v === "MID") return "Mid-level";
  if (v === "SENIOR") return "Senior";
  if (v === "LEAD") return "Lead";
  return null;
}

const TRACKER_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SAVED:         { label: "Saved",        color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.22)" },
  REACHING_OUT:  { label: "Reaching out", color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.22)"  },
  APPLIED:       { label: "Applied ✓",    color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.28)"  },
  INTERVIEW:     { label: "Interview",    color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.28)"  },
  OFFER:         { label: "Offer!",       color: "#4ade80", bg: "rgba(74,222,128,0.18)",  border: "rgba(74,222,128,0.40)"  },
  REJECTED:      { label: "Rejected",     color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.22)" },
  GHOSTED:       { label: "Ghosted",      color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.18)" },
};

export function JobCard({ job, userId, trackerStatus }: { job: JobCardData; userId?: string | null; trackerStatus?: string }) {
  const postedDate = job.postedAt ? new Date(job.postedAt) : null;
  const postedLabel = postedDate && !isNaN(postedDate.getTime())
    ? formatDistanceToNow(postedDate, { addSuffix: true })
    : null;

  const rolecat = getRoleCategory(job.roleCategory ?? "software");

  const fitHigh = job.fitScore >= 60;
  const fitMid  = job.fitScore >= 30;
  const fitColor = fitHigh ? "#4ade80" : fitMid ? "#fbbf24" : "#94a3b8";
  const fitBg    = fitHigh ? "rgba(74,222,128,0.12)" : fitMid ? "rgba(251,191,36,0.10)" : "rgba(255,255,255,0.04)";
  const fitBorder= fitHigh ? "rgba(74,222,128,0.28)" : fitMid ? "rgba(251,191,36,0.22)" : "rgba(255,255,255,0.08)";

  const workplace  = fmtWorkplace(job.workplaceType);
  const employment = fmtEmployment(job.employmentType);
  const experience = fmtExperience(job.experienceLevel);

  return (
    <article className="inset-card" style={{ display: "grid", gap: 11, padding: "14px 16px" }}>

      {/* ── Row 1: category chip + tracker status + fit score ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          padding: "3px 10px",
          borderRadius: 999,
          color: rolecat.color,
          background: rolecat.bg,
          border: `1px solid ${rolecat.border}`,
        }}>
          {rolecat.label}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {trackerStatus && TRACKER_LABELS[trackerStatus] && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "3px 10px",
              borderRadius: 999,
              color: TRACKER_LABELS[trackerStatus].color,
              background: TRACKER_LABELS[trackerStatus].bg,
              border: `1px solid ${TRACKER_LABELS[trackerStatus].border}`,
            }}>
              {TRACKER_LABELS[trackerStatus].label}
            </span>
          )}
          {job.fitScore > 0 && (
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.04em",
              padding: "3px 11px",
              borderRadius: 999,
              color: fitColor,
              background: fitBg,
              border: `1px solid ${fitBorder}`,
            }}>
              Fit {job.fitScore}
            </span>
          )}
        </div>
      </div>

      {/* ── Row 2: title + save ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
          <Link href={`/jobs/${job.id}`} style={{ color: "#f5f5f5" }}>{job.title}</Link>
        </h3>
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          <SaveToTracker jobId={job.id} userId={userId} />
        </div>
      </div>

      {/* ── Row 3: company · location · time ── */}
      <div style={{ fontSize: 13, color: "#9ca3af", display: "flex", flexWrap: "wrap", gap: "2px 6px" }}>
        {job.companySlug
          ? <Link href={`/companies/${job.companySlug}`} style={{ color: "#d4d4d8", fontWeight: 600 }}>{job.company}</Link>
          : <span style={{ color: "#d4d4d8", fontWeight: 600 }}>{job.company}</span>}
        {job.location && <><span>·</span><span>{job.location}</span></>}
        {postedLabel && <><span>·</span><span title={postedDate?.toLocaleDateString() ?? ""}>{postedLabel}</span></>}
      </div>

      {/* ── Row 4: workplace / type / level badges ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {workplace && <Chip>{workplace}</Chip>}
        {employment && <Chip>{employment}</Chip>}
        {experience && <Chip>{experience}</Chip>}
        {job.salary && <Chip accent>{job.salary.label}</Chip>}
      </div>

      {/* ── Row 5: fit reasons (skill matches) ── */}
      {job.fitReasons.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {job.fitReasons.map((r, i) => (
            <span key={i} style={{ fontSize: 11, color: "#a1a1aa", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "2px 8px" }}>
              {r}
            </span>
          ))}
        </div>
      )}

      {/* ── Row 6: description snippet ── */}
      {job.descriptionText && (() => {
        const snippet = (stripHtml(job.descriptionText) ?? "").trim().slice(0, 280);
        return snippet ? (
          <p style={{ margin: 0, fontSize: 13, color: "#8b8b95", lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
            {snippet}
          </p>
        ) : null;
      })()}

      {/* ── Row 7: actions ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2 }}>
        <Link className="button" href={`/jobs/${job.id}`} style={{ fontSize: 13, minHeight: 36, padding: "8px 14px" }}>
          Open job
        </Link>
        <Link className="button secondary" href={userId ? `/cover-letters/${job.id}` : `/login?next=/cover-letters/${job.id}`}
          style={{ fontSize: 13, minHeight: 36, padding: "8px 14px" }}>
          Cover letter
        </Link>
        <Link className="button secondary" href={userId ? `/ats-check/${job.id}` : `/login?next=/ats-check/${job.id}`}
          style={{ fontSize: 13, minHeight: 36, padding: "8px 14px" }}>
          ATS resume
        </Link>
        <Link className="button secondary" href={userId ? `/outreach/${job.id}` : `/login?next=/outreach/${job.id}`}
          style={{ fontSize: 13, minHeight: 36, padding: "8px 14px" }}>
          Outreach
        </Link>
      </div>
    </article>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: "3px 9px",
      borderRadius: 6,
      border: accent ? "1px solid rgba(251,191,36,0.25)" : "1px solid rgba(255,255,255,0.09)",
      background: accent ? "rgba(251,191,36,0.09)" : "rgba(255,255,255,0.04)",
      color: accent ? "#fbbf24" : "#a1a1aa",
    }}>
      {children}
    </span>
  );
}
