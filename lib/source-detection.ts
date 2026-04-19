export function detectSourceFromUrl(url?: string) {
  if (!url) return { sourceType: undefined, sourceToken: undefined };
  const normalized = url.trim();
  let match =
    normalized.match(/boards(?:-api)?\.greenhouse\.io\/(?:embed\/)?job_board\?for=([a-z0-9_-]+)/i) ||
    normalized.match(/boards(?:-api)?\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i) ||
    normalized.match(/greenhouse\.io\/([a-z0-9_-]+)$/i);
  if (match?.[1]) return { sourceType: "GREENHOUSE", sourceToken: match[1] };

  match = normalized.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i) || normalized.match(/api\.lever\.co\/v0\/postings\/([a-z0-9_-]+)/i);
  if (match?.[1]) return { sourceType: "LEVER", sourceToken: match[1] };

  match = normalized.match(/jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i) || normalized.match(/ashbyhq\.com\/posting-api\/job-board\/([a-z0-9_-]+)/i);
  if (match?.[1]) return { sourceType: "ASHBY", sourceToken: match[1] };

  match = normalized.match(/apply\.workable\.com\/([a-z0-9_-]+)/i);
  if (match?.[1]) return { sourceType: "WORKABLE", sourceToken: match[1] };

  match = normalized.match(/([a-z0-9_-]+)\.recruitee\.com/i);
  if (match?.[1]) return { sourceType: "RECRUITEE", sourceToken: match[1] };

  return { sourceType: undefined, sourceToken: undefined };
}
