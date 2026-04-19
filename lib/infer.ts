/**
 * Inference helpers that derive structured fields from a job's title and
 * description text when the source did not supply them (i.e. value is UNKNOWN).
 *
 * Rules are evaluated on the title first (most reliable signal), then fall
 * back to the first ~800 characters of the description.
 */

// Limit how much description text we scan so this stays cheap in a tight loop.
const DESC_SCAN_CHARS = 800;

function haystack(title: string, description?: string | null): string {
  return `${title} ${(description ?? "").slice(0, DESC_SCAN_CHARS)}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// Workplace type
// ---------------------------------------------------------------------------

export function inferWorkplaceType(
  title: string,
  description?: string | null,
): "REMOTE" | "HYBRID" | "ONSITE" | null {
  const text = haystack(title, description);

  // Hybrid takes priority over "remote" in mixed phrases like "hybrid remote"
  if (/\bhybrid\b/.test(text)) return "HYBRID";

  if (
    /\bremote\b|\bwork from home\b|\bwfh\b|\bfully remote\b|\b100%\s*remote\b|\bdistributed team\b/.test(
      text,
    )
  )
    return "REMOTE";

  if (/\bon[- ]?site\b|\bonsite\b|\bin[- ]?office\b|\bin[- ]?person\b/.test(text))
    return "ONSITE";

  return null;
}

// ---------------------------------------------------------------------------
// Employment type
// ---------------------------------------------------------------------------

export function inferEmploymentType(
  title: string,
  description?: string | null,
): "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | null {
  const titleLower = title.toLowerCase();
  const text = haystack(title, description);

  // Internship check on title wins immediately
  if (/\bintern\b|\binternship\b|\bco[- ]?op\b/.test(titleLower)) return "INTERNSHIP";

  if (/\bcontract\b|\bcontractor\b|\bfreelance\b|\b1099\b|\bc2c\b|\bcorp[- ]?to[- ]?corp\b/.test(text))
    return "CONTRACT";

  if (/\bpart[- ]?time\b/.test(text)) return "PART_TIME";

  if (/\bintern\b|\binternship\b/.test(text)) return "INTERNSHIP";

  if (/\bfull[- ]?time\b|\bpermanent position\b|\bpermanent role\b/.test(text))
    return "FULL_TIME";

  return null;
}

// ---------------------------------------------------------------------------
// Experience level
// ---------------------------------------------------------------------------

export function inferExperienceLevel(
  title: string,
  description?: string | null,
): "INTERN" | "ENTRY" | "MID" | "SENIOR" | "LEAD" | null {
  const titleLower = title.toLowerCase();
  const text = haystack(title, description);

  // --- Title signals (strongest) ---
  if (/\bintern\b|\binternship\b/.test(titleLower)) return "INTERN";

  if (
    /\blead\b|\bprincipal\b|\bstaff\b|\bdirector\b|\bhead of\b|\bvp\b|\bvice president\b|\bengineering manager\b/.test(
      titleLower,
    )
  )
    return "LEAD";

  if (/\bsenior\b|\bsr\.?\s/.test(titleLower)) return "SENIOR";

  if (
    /\bjunior\b|\bjr\.?\s|\bentry[- ]level\b|\bnew grad\b|\bassociate\b/.test(titleLower)
  )
    return "ENTRY";

  // --- Description signals (fallback) ---
  if (/\bintern\b|\binternship\b/.test(text)) return "INTERN";

  if (
    /\bprincipal engineer\b|\bstaff engineer\b|\btech lead\b|\btechnical lead\b|\bengineering manager\b|\b10\+\s*years\b|\b8\+\s*years\b/.test(
      text,
    )
  )
    return "LEAD";

  if (
    /\bsenior engineer\b|\bsenior developer\b|\b7\+\s*years\b|\b6\+\s*years\b|\b5\+\s*years\b/.test(
      text,
    )
  )
    return "SENIOR";

  if (
    /\bjunior\b|\bentry[- ]level\b|\bnew grad(uate)?\b|\b0[–-]2\s*years\b|\b1[–-]2\s*years\b/.test(
      text,
    )
  )
    return "ENTRY";

  if (
    /\bmid[- ]level\b|\b3[–-]5\s*years\b|\b2[–-]4\s*years\b|\b3\+\s*years\b|\b4\+\s*years\b/.test(
      text,
    )
  )
    return "MID";

  return null;
}

// ---------------------------------------------------------------------------
// Convenience: infer all three at once
// ---------------------------------------------------------------------------

export type InferredJobFields = {
  workplaceType: "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "UNKNOWN";
  experienceLevel: "INTERN" | "ENTRY" | "MID" | "SENIOR" | "LEAD" | "UNKNOWN";
};

export function inferJobFields(
  title: string,
  description?: string | null,
): InferredJobFields {
  return {
    workplaceType: inferWorkplaceType(title, description) ?? "UNKNOWN",
    employmentType: inferEmploymentType(title, description) ?? "UNKNOWN",
    experienceLevel: inferExperienceLevel(title, description) ?? "UNKNOWN",
  };
}
