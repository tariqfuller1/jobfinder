/**
 * Salary estimation heuristics based on 2024–2025 US tech market data.
 *
 * This is intentionally a rough guide — show it as a range with an
 * explicit "estimate" label, never as a guaranteed or precise number.
 *
 * Methodology:
 *   1. Pick a base range from (role category × experience level)
 *   2. Apply a location multiplier
 *   3. Apply a company-tier multiplier
 *   4. For contracts, convert annual → hourly equivalent
 */

export type SalaryEstimate = {
  low: number;
  high: number;
  /** Formatted label e.g. "$130k–$200k / yr" */
  label: string;
  /** Short plain-English reasoning */
  basis: string;
};

// ─── Base annual ranges (USD) ────────────────────────────────────────────────

type ExpKey = "INTERN" | "ENTRY" | "MID" | "SENIOR" | "LEAD" | "UNKNOWN";
type RoleKey = "software" | "game_programming" | "game_design" | "data_ml" | "mobile" | "default";

const BASE: Record<RoleKey, Record<ExpKey, [number, number]>> = {
  software: {
    INTERN:  [52_000,  105_000],
    ENTRY:   [90_000,  135_000],
    MID:     [125_000, 178_000],
    SENIOR:  [165_000, 248_000],
    LEAD:    [210_000, 330_000],
    UNKNOWN: [100_000, 185_000],
  },
  game_programming: {
    INTERN:  [42_000,  82_000],
    ENTRY:   [72_000,  112_000],
    MID:     [102_000, 152_000],
    SENIOR:  [142_000, 208_000],
    LEAD:    [178_000, 268_000],
    UNKNOWN: [88_000,  162_000],
  },
  game_design: {
    INTERN:  [38_000,  68_000],
    ENTRY:   [52_000,  82_000],
    MID:     [78_000,  118_000],
    SENIOR:  [112_000, 162_000],
    LEAD:    [142_000, 208_000],
    UNKNOWN: [68_000,  128_000],
  },
  data_ml: {
    INTERN:  [65_000,  112_000],
    ENTRY:   [108_000, 152_000],
    MID:     [148_000, 205_000],
    SENIOR:  [198_000, 292_000],
    LEAD:    [255_000, 378_000],
    UNKNOWN: [132_000, 228_000],
  },
  mobile: {
    INTERN:  [50_000,  92_000],
    ENTRY:   [88_000,  132_000],
    MID:     [128_000, 182_000],
    SENIOR:  [172_000, 252_000],
    LEAD:    [208_000, 292_000],
    UNKNOWN: [108_000, 188_000],
  },
  default: {
    INTERN:  [48_000,  92_000],
    ENTRY:   [85_000,  130_000],
    MID:     [115_000, 165_000],
    SENIOR:  [155_000, 232_000],
    LEAD:    [195_000, 305_000],
    UNKNOWN: [90_000,  170_000],
  },
};

// ─── Role category detection ─────────────────────────────────────────────────

function detectRole(title: string, tags: string[]): RoleKey {
  const t = title.toLowerCase();
  const tagStr = tags.join(" ").toLowerCase();
  const combined = `${t} ${tagStr}`;

  if (/machine learning|ml engineer|data scientist|data engineer|ai engineer|analytics engineer|applied scientist/.test(combined))
    return "data_ml";
  if (/ios|android|mobile engineer|mobile developer|react native|flutter/.test(combined))
    return "mobile";
  if (/gameplay|game programmer|engine programmer|graphics programmer|tools engineer|tools programmer|rendering engineer|physics programmer|unreal|unity developer/.test(combined))
    return "game_programming";
  if (/game designer|level designer|narrative designer|systems designer|technical designer|environment artist|concept artist|3d artist|technical artist|animator/.test(combined))
    return "game_design";
  if (/software engineer|software developer|backend|frontend|full.?stack|web developer|platform engineer|devops|sre|site reliability|cloud engineer|infrastructure/.test(combined))
    return "software";

  return "default";
}

// ─── Location multiplier ─────────────────────────────────────────────────────

function locationMultiplier(location: string | null): { mult: number; label: string } {
  if (!location) return { mult: 1.0, label: "US market" };
  const loc = location.toLowerCase();

  if (/san francisco|bay area|sf|silicon valley|palo alto|mountain view|sunnyvale|menlo park|san jose/.test(loc))
    return { mult: 1.30, label: "San Francisco / Bay Area" };
  if (/new york|nyc|manhattan|brooklyn/.test(loc))
    return { mult: 1.22, label: "New York" };
  if (/seattle|bellevue|redmond/.test(loc))
    return { mult: 1.16, label: "Seattle" };
  if (/los angeles|la |santa monica|venice|culver city/.test(loc))
    return { mult: 1.12, label: "Los Angeles" };
  if (/boston|cambridge ma/.test(loc))
    return { mult: 1.10, label: "Boston" };
  if (/austin|denver|chicago|miami|atlanta|raleigh|durham|charlotte/.test(loc))
    return { mult: 1.02, label: loc.split(",")[0].trim() };
  if (/remote/.test(loc))
    return { mult: 1.0, label: "Remote / US" };

  return { mult: 0.92, label: "Other US" };
}

// ─── Company-tier multiplier ─────────────────────────────────────────────────

const TIER1 = /\b(google|apple|meta|facebook|amazon|microsoft|netflix|openai|nvidia|salesforce|oracle|adobe|intel|qualcomm|broadcom)\b/i;
const TIER2 = /\b(stripe|airbnb|uber|lyft|doordash|snowflake|databricks|figma|notion|canva|anthropic|vercel|linear|ramp|perplexity|discord|twitch|reddit|pinterest|instacart|coinbase|robinhood|plaid|brex|asana)\b/i;
const AAA_GAME = /\b(epic games|riot games|bungie|2k|activision|blizzard|rockstar|ea |electronic arts|ubisoft|square enix|sega|capcom|naughty dog|insomniac|crystal dynamics|gearbox|respawn)\b/i;

function companyMultiplier(company: string): { mult: number; label: string } {
  if (TIER1.test(company)) return { mult: 1.28, label: "Tier-1 company" };
  if (TIER2.test(company)) return { mult: 1.15, label: "Tier-2 / well-funded" };
  if (AAA_GAME.test(company)) return { mult: 1.10, label: "AAA game studio" };
  return { mult: 1.0, label: "" };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function fmtHourly(n: number): string {
  return `$${Math.round(n)}/hr`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function estimateSalary(job: {
  title: string;
  experienceLevel: string;
  employmentType: string;
  location: string | null;
  company: string;
  tags: string[];
}): SalaryEstimate {
  const role = detectRole(job.title, job.tags);
  const exp = (job.experienceLevel as ExpKey) in BASE[role]
    ? (job.experienceLevel as ExpKey)
    : "UNKNOWN";

  let [low, high] = BASE[role][exp];

  const loc = locationMultiplier(job.location);
  low  = Math.round(low  * loc.mult);
  high = Math.round(high * loc.mult);

  const co = companyMultiplier(job.company);
  low  = Math.round(low  * co.mult);
  high = Math.round(high * co.mult);

  // Round to nearest $5k for cleaner display
  low  = Math.round(low  / 5_000) * 5_000;
  high = Math.round(high / 5_000) * 5_000;

  // For contracts / internships show hourly equivalent
  const isHourly =
    job.employmentType === "CONTRACT" ||
    job.employmentType === "INTERNSHIP" ||
    job.experienceLevel === "INTERN";

  let label: string;
  if (isHourly) {
    // Contract: ~1.35× annual ÷ 2080 hours (no benefits overhead baked in for simplicity)
    const factor = job.employmentType === "CONTRACT" ? 1.35 : 1.0;
    const lowHr  = (low  * factor) / 2_080;
    const highHr = (high * factor) / 2_080;
    label = `${fmtHourly(lowHr)}–${fmtHourly(highHr)}`;
  } else {
    label = `${fmt(low)}–${fmt(high)} / yr`;
  }

  // Build basis string
  const parts: string[] = [];
  parts.push(role.replace("_", " "));
  parts.push(exp === "UNKNOWN" ? "unspecified level" : exp.toLowerCase());
  if (loc.label) parts.push(loc.label);
  if (co.label)  parts.push(co.label);

  return {
    low,
    high,
    label,
    basis: parts.join(" · "),
  };
}
