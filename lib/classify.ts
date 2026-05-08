/**
 * classifyJobRole — derive a granular role category from job title + tags.
 * Pure function, O(n) on rules. No DB access, no side effects.
 * Rules are evaluated in order; first match wins.
 */

export type RoleCategory = {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
};

export const ROLE_CATEGORIES: RoleCategory[] = [
  { id: "game_dev",    label: "Game Dev",    color: "#a78bfa", bg: "rgba(139,92,246,0.14)",  border: "rgba(139,92,246,0.35)" },
  { id: "game_design", label: "Game Design", color: "#c084fc", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.3)"  },
  { id: "frontend",    label: "Frontend",    color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.3)"   },
  { id: "full_stack",  label: "Full Stack",  color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"   },
  { id: "backend",     label: "Backend",     color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)"   },
  { id: "mobile",      label: "Mobile",      color: "#fb923c", bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.3)"   },
  { id: "data_ml",     label: "Data / AI",   color: "#f472b6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)"  },
  { id: "devops",      label: "DevOps",      color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)"   },
  { id: "qa",          label: "QA / Testing",color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)"  },
  { id: "embedded",    label: "Embedded",    color: "#a8a29e", bg: "rgba(168,162,158,0.12)", border: "rgba(168,162,158,0.3)"  },
  { id: "security",    label: "Security",    color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)"  },
  { id: "software",    label: "Software",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"   },
];

const CATEGORY_MAP = new Map(ROLE_CATEGORIES.map((c) => [c.id, c]));

// Rules evaluated in order — first match wins.
// Patterns apply to "title tags..." lowercased.
const RULES: Array<{ re: RegExp; id: string }> = [
  // ── Game-specific (check before generic "engineer" patterns) ──────────────
  { re: /gameplay\s*(programmer|engineer|dev)|game\s*(programmer|engineer)|engine\s*programmer|graphics\s*(programmer|engineer)|rendering\s*engineer|physics\s*programmer|tools\s*(programmer|engineer)|network\s*(programmer|engineer)/, id: "game_dev" },
  { re: /unity\s*(developer|engineer|programmer)|unreal\s*(developer|engineer|programmer)|game\s*dev(eloper)?/, id: "game_dev" },
  { re: /game\s*design(er)?|level\s*design(er)?|narrative\s*design(er)?|systems\s*design(er)?|technical\s*design(er)?|content\s*design(er)?|game\s*artist|concept\s*artist|vfx\s*artist|technical\s*artist/, id: "game_design" },

  // ── Mobile ────────────────────────────────────────────────────────────────
  { re: /ios\s*(engineer|developer|lead)|android\s*(engineer|developer|lead)|react\s*native\s*(developer|engineer)|flutter\s*(developer|engineer)|mobile\s*(engineer|developer|lead|architect)/, id: "mobile" },

  // ── Full Stack (before frontend/backend so "full stack react node" matches) ─
  { re: /full[\s-]?stack|fullstack/, id: "full_stack" },

  // ── Frontend ──────────────────────────────────────────────────────────────
  { re: /front[\s-]?end\s*(engineer|developer|lead|architect)|frontend\s*(engineer|developer)|ui\s*(engineer|developer)|react\s*(engineer|developer)|angular\s*(developer|engineer)|vue\s*(developer|engineer)|next\.?js\s*(developer|engineer)/, id: "frontend" },

  // ── Backend ───────────────────────────────────────────────────────────────
  { re: /back[\s-]?end\s*(engineer|developer|lead|architect)|backend\s*(engineer|developer)|api\s*(engineer|developer)|server[\s-]?side|python\s*(engineer|developer)|java\s*(engineer|developer)|golang\s*(developer|engineer)|go\s+developer|rust\s*(engineer|developer)|node\s*(engineer|developer)|\.net\s*(developer|engineer)|c\+\+\s*(developer|engineer|programmer)|c#\s*(developer|engineer)/, id: "backend" },
  { re: /software\s*(engineer|developer|architect)/, id: "backend" }, // generic catch-all before "software"

  // ── Data / ML / AI ───────────────────────────────────────────────────────
  { re: /data\s*(engineer|scientist|analyst)|machine\s*learning\s*(engineer)?|ml\s*engineer|ai\s*engineer|analytics\s*engineer|applied\s*scientist|research\s*engineer|data\s*science/, id: "data_ml" },

  // ── DevOps / Infrastructure ───────────────────────────────────────────────
  { re: /devops|site\s*reliability|sre\b|cloud\s*(engineer|developer|architect)|platform\s*engineer|infrastructure\s*engineer|build\s*engineer|release\s*engineer/, id: "devops" },

  // ── QA / Testing ─────────────────────────────────────────────────────────
  { re: /qa\s*engineer|quality\s*assurance\s*(engineer)?|test\s*(engineer|automation|lead)|sdet\b|automation\s*engineer/, id: "qa" },

  // ── Embedded / Firmware ───────────────────────────────────────────────────
  { re: /embedded\s*(software|engineer|developer)|firmware\s*(engineer|developer)/, id: "embedded" },

  // ── Security ──────────────────────────────────────────────────────────────
  { re: /security\s*(engineer|researcher|analyst)|application\s*security|appsec|penetration\s*test/, id: "security" },
];

export function classifyJobRole(title: string, tags: string[] = []): string {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  for (const { re, id } of RULES) {
    if (re.test(text)) return id;
  }
  return "software";
}

export function getRoleCategory(id: string): RoleCategory {
  return CATEGORY_MAP.get(id) ?? CATEGORY_MAP.get("software")!;
}
