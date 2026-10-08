import { prisma } from "@/lib/db";
import type { AtsTarget } from "@/lib/auto-apply/types";

type JobLike = {
  source: string;
  externalId: string;
  company: string;
  applyUrl: string | null;
  sourceUrl: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parse(value: string | null) {
  try {
    return value && /^https?:\/\//i.test(value) ? new URL(value) : null;
  } catch {
    return null;
  }
}

function fromUrl(url: URL): AtsTarget | null {
  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  if (/(^|\.)greenhouse\.io$/i.test(url.host)) {
    // job-boards.greenhouse.io/{token}/jobs/{id} or boards.greenhouse.io/{token}/jobs/{id}
    if (segments.length >= 3 && segments[1] === "jobs" && /^\d+$/.test(segments[2])) {
      return greenhouse(segments[0], segments[2]);
    }
    // boards.greenhouse.io/embed/job_app?for={token}&token={id}
    const token = url.searchParams.get("for");
    const id = url.searchParams.get("token");
    if (token && id && /^\d+$/.test(id)) return greenhouse(token, id);
    return null;
  }

  if (/^jobs(\.eu)?\.lever\.co$/i.test(url.host) && segments.length >= 2 && UUID.test(segments[1])) {
    return {
      ats: "lever",
      boardToken: segments[0],
      postingId: segments[1],
      formUrl: `${url.origin}/${encodeURIComponent(segments[0])}/${segments[1]}/apply`,
    };
  }

  if (/^jobs\.ashbyhq\.com$/i.test(url.host) && segments.length >= 2 && UUID.test(segments[1])) {
    return {
      ats: "ashby",
      boardToken: segments[0],
      postingId: segments[1],
      formUrl: `https://jobs.ashbyhq.com/${encodeURIComponent(segments[0])}/${segments[1]}/application`,
    };
  }

  return null;
}

function greenhouse(token: string, id: string): AtsTarget {
  return {
    ats: "greenhouse",
    boardToken: token,
    postingId: id,
    formUrl: `https://job-boards.greenhouse.io/${encodeURIComponent(token)}/jobs/${id}`,
  };
}

/**
 * Works out which ATS hosts a job's application form. Returns null for
 * anything other than Greenhouse, Lever, or Ashby — those are the only forms
 * auto-apply knows how to read and fill.
 */
export async function detectAtsTarget(job: JobLike): Promise<AtsTarget | null> {
  for (const candidate of [job.applyUrl, job.sourceUrl]) {
    const url = parse(candidate);
    const target = url && fromUrl(url);
    if (target) return target;
  }

  // Greenhouse boards on a company's own domain (stripe.com/jobs/...?gh_jid=123)
  // don't carry the board token, so look it up from the synced company record.
  if (job.source === "greenhouse" && /^\d+$/.test(job.externalId)) {
    const company = await prisma.company.findFirst({
      where: { name: job.company, sourceType: { in: ["GREENHOUSE", "greenhouse"] }, sourceToken: { not: null } },
      select: { sourceToken: true },
    });
    if (company?.sourceToken) return greenhouse(company.sourceToken, job.externalId);
    // Tokens from GREENHOUSE_COMPANY_TOKENS with no company record keep the
    // token as the company name (see lib/adapters/greenhouse.ts).
    if (/^[a-z0-9-]+$/.test(job.company)) return greenhouse(job.company, job.externalId);
  }

  return null;
}
