export const SUPPORT_CATEGORIES = [
  "Bug report",
  "Feature request",
  "General question",
  "Other",
] as const;

export type SupportCategory = typeof SUPPORT_CATEGORIES[number];
