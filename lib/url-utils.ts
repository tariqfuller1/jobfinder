export function safeTrim(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isHttpUrl(value?: string | null) {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

function parseUrl(value?: string | null) {
  if (!isHttpUrl(value)) return null;
  try {
    return new URL(value!);
  } catch {
    return null;
  }
}

export function isAtsHost(value?: string | null) {
  const url = parseUrl(value);
  if (!url) return false;

  return [
    /^jobs\.lever\.co$/i,
    /^jobs\.ashbyhq\.com$/i,
    /^apply\.workable\.com$/i,
    /(^|\.)recruitee\.com$/i,
    /(^|\.)greenhouse\.io$/i,
  ].some((pattern) => pattern.test(url.host));
}

export function deriveWebsiteHome(value?: string | null) {
  const url = parseUrl(value);
  if (!url || isAtsHost(value)) return null;
  return `${url.origin}/`;
}

export function deriveAtsBoardRoot(value?: string | null) {
  const url = parseUrl(value);
  if (!url) return null;

  const firstSegment = url.pathname.split("/").filter(Boolean)[0];

  if (/^jobs\.lever\.co$/i.test(url.host) && firstSegment) {
    return `${url.origin}/${firstSegment}`;
  }

  if (/^jobs\.ashbyhq\.com$/i.test(url.host) && firstSegment) {
    return `${url.origin}/${firstSegment}`;
  }

  if (/^apply\.workable\.com$/i.test(url.host) && firstSegment) {
    return `${url.origin}/${firstSegment}`;
  }

  if (/(^|\.)recruitee\.com$/i.test(url.host)) {
    return `${url.origin}/`;
  }

  if (/(^|\.)greenhouse\.io$/i.test(url.host)) {
    const companyToken = url.searchParams.get("for") || firstSegment;
    if (companyToken && companyToken !== "embed" && companyToken !== "job_board") {
      return `${url.origin}/${companyToken}`;
    }
  }

  return null;
}

export function looksBadApplyDestination(value?: string | null) {
  const url = parseUrl(value);
  if (!url) return true;

  const normalized = url.href.replace(/\/?$/, "");
  return [
    /^https?:\/\/jobs\.lever\.co$/i,
    /^https?:\/\/jobs\.ashbyhq\.com$/i,
    /^https?:\/\/apply\.workable\.com$/i,
    /^https?:\/\/boards\.greenhouse\.io$/i,
    /^https?:\/\/job-boards\.greenhouse\.io$/i,
    /^https?:\/\/www\.greenhouse\.io$/i,
    /^https?:\/\/greenhouse\.io$/i,
  ].some((pattern) => pattern.test(normalized));
}

export function dedupeUrls(values: Array<string | null | undefined>) {
  return values.filter((value, index, list): value is string => {
    return Boolean(value && isHttpUrl(value) && !looksBadApplyDestination(value) && list.indexOf(value) === index);
  });
}
