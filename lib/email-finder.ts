import { getGroqClient } from "@/lib/groq";

export type GuessedEmail = {
  email: string;
  label: string;
  isGeneric: boolean;
  contactName?: string;
  aiSuggested?: boolean;
};

function extractDomainFromPattern(pattern: string): string | null {
  const at = pattern.indexOf("@");
  if (at === -1) return null;
  const domain = pattern.slice(at + 1).trim();
  return domain.length > 0 ? domain : null;
}

export function extractDomainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function applyPattern(pattern: string, firstName: string, lastName: string): string {
  return pattern
    .replace(/\bfirst\b/gi, firstName)
    .replace(/\blast\b/gi, lastName)
    .replace(/\bf\b/g, firstName[0] ?? "")
    .replace(/\bl\b/g, lastName[0] ?? "");
}

function cleanName(part: string) {
  return part.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function guessOutreachEmails(
  websiteUrl: string | null | undefined,
  emailPatterns: string[],
  contacts: Array<{ name: string; email?: string | null }>,
): GuessedEmail[] {
  const seen = new Set<string>();
  const results: GuessedEmail[] = [];

  function add(item: GuessedEmail) {
    const key = item.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  }

  // 1. Contacts that already have known emails
  for (const contact of contacts) {
    if (contact.email?.trim()) {
      add({ email: contact.email.trim(), label: contact.name, isGeneric: false, contactName: contact.name });
    }
  }

  // 2. Guess emails for contacts using email patterns
  if (emailPatterns.length > 0) {
    for (const contact of contacts) {
      if (contact.email?.trim()) continue;
      const parts = contact.name.trim().split(/\s+/);
      const first = cleanName(parts[0] ?? "");
      const last = cleanName(parts[parts.length - 1] ?? "");
      if (!first) continue;

      for (const pattern of emailPatterns) {
        const guessed = applyPattern(pattern, first, last);
        if (guessed.includes("@") && !guessed.match(/\b(first|last)\b/i)) {
          add({ email: guessed, label: contact.name, isGeneric: false, contactName: contact.name });
          break;
        }
      }
    }
  }

  // 3. Derive domain: prefer the email pattern domain (explicitly set for email use)
  // over the websiteUrl domain, which can be wrong (e.g. a Replit dev URL).
  const urlDomain = extractDomainFromUrl(websiteUrl);
  const patternDomain = emailPatterns.length > 0 ? extractDomainFromPattern(emailPatterns[0]) : null;
  const domain = patternDomain ?? urlDomain;

  if (domain) {
    // Generic outreach addresses every company usually has
    for (const { email, label } of [
      { email: `careers@${domain}`, label: "Careers" },
      { email: `jobs@${domain}`, label: "Jobs" },
      { email: `recruiting@${domain}`, label: "Recruiting" },
      { email: `hr@${domain}`, label: "HR" },
    ]) {
      add({ email, label, isGeneric: true });
    }
  }

  return results;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Local parts that are not useful for cold outreach
const JUNK_LOCAL = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply", "bounce", "mailer-daemon",
  "postmaster", "webmaster", "hostmaster", "abuse", "spam", "unsubscribe",
  "newsletter", "notifications", "alerts", "updates", "info", "contact",
  "hello", "support", "help", "admin", "security", "legal", "privacy",
  "billing", "sales", "marketing", "press", "media", "pr",
]);

// Fake/placeholder domains to ignore
const JUNK_DOMAIN = new Set(["example.com", "example.org", "test.com", "domain.com", "email.com"]);

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobSearch/1.0)" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractEmailsFromHtml(html: string, companyDomain: string | null): GuessedEmail[] {
  const raw = html.match(EMAIL_REGEX) ?? [];
  const seen = new Set<string>();
  const onDomain: GuessedEmail[] = [];

  for (const email of raw) {
    const lower = email.toLowerCase();
    // Ignore fake image filenames matched by the regex (e.g. icon@2x.png)
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(lower)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);

    const atIdx = lower.indexOf("@");
    const local = lower.slice(0, atIdx);
    const emailDomain = lower.slice(atIdx + 1);
    if (JUNK_DOMAIN.has(emailDomain)) continue;
    if (JUNK_LOCAL.has(local)) continue;

    // Only surface emails on the company's own domain
    if (companyDomain && emailDomain === companyDomain) {
      onDomain.push({ email: lower, label: "Found on website", isGeneric: false });
    }
  }

  return onDomain.slice(0, 8);
}

/**
 * Fetches the company website and common contact pages, extracts real email addresses.
 * Returns [] on any failure — never throws.
 */
export async function scrapeEmailsFromWebsite(
  websiteUrl: string | null | undefined,
  domain: string | null,
): Promise<GuessedEmail[]> {
  if (!websiteUrl) return [];

  let base: URL;
  try {
    base = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
  } catch {
    return [];
  }

  const pagesToCheck = [
    base.href,
    new URL("/contact", base).href,
    new URL("/contact-us", base).href,
    new URL("/careers", base).href,
    new URL("/about", base).href,
  ];

  // Fetch all pages in parallel
  const pages = await Promise.all(pagesToCheck.map(fetchPage));
  const combined = pages.filter(Boolean).join("\n");
  return extractEmailsFromHtml(combined, domain);
}

/**
 * Calls Groq to suggest likely outreach emails for a company.
 * Returns [] if GROQ_API_KEY is not set or the call fails — never throws.
 */
export async function suggestEmailsWithAI(
  companyName: string,
  domain: string | null,
  emailPatterns: string[],
  companyCategory: string,
): Promise<GuessedEmail[]> {
  if (!domain) return [];
  if (!process.env.GROQ_API_KEY?.trim()) return [];

  try {
    const groq = getGroqClient();
    const patternHint = emailPatterns.length > 0
      ? `Known email format: ${emailPatterns.join(", ")}.`
      : "No email format on file.";

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 256,
      messages: [
        {
          role: "system",
          content:
            "You are an outreach research assistant. Given a company's name, domain, and category, suggest the 4 most likely email addresses someone could use to reach the jobs, HR, or recruiting team for cold outreach. Return ONLY a JSON array of objects with keys 'email' (string) and 'label' (string). No explanations, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Company: ${companyName}\nDomain: ${domain}\nCategory: ${companyCategory}\n${patternHint}\n\nReturn 4 likely outreach email addresses as JSON.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    // Strip markdown code fences if model wraps it
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    const results: GuessedEmail[] = [];
    const seenInAI = new Set<string>();
    for (const item of parsed) {
      if (typeof item.email !== "string" || typeof item.label !== "string") continue;
      const email = item.email.toLowerCase().trim();
      if (!email.includes("@") || email.split("@")[1] !== domain) continue; // only accept emails on this exact domain
      if (seenInAI.has(email)) continue;
      seenInAI.add(email);
      results.push({ email, label: item.label, isGeneric: true, aiSuggested: true });
    }
    return results;
  } catch {
    return [];
  }
}
