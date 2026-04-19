import { dedupeUrls, deriveAtsBoardRoot, deriveWebsiteHome, safeTrim } from "@/lib/url-utils";

export function resolveJobLinks(input: {
  applyUrl?: string | null;
  sourceUrl?: string | null;
  companyCareersUrl?: string | null;
  companyWebsiteUrl?: string | null;
}) {
  const applyUrl = safeTrim(input.applyUrl);
  const sourceUrl = safeTrim(input.sourceUrl);
  const companyCareersUrl = safeTrim(input.companyCareersUrl);
  const companyWebsiteUrl = safeTrim(input.companyWebsiteUrl);

  const directCandidates = dedupeUrls([applyUrl, companyCareersUrl, sourceUrl, companyWebsiteUrl]);
  const atsBoardCandidates = dedupeUrls([
    deriveAtsBoardRoot(applyUrl),
    deriveAtsBoardRoot(sourceUrl),
    deriveAtsBoardRoot(companyCareersUrl),
  ]);
  const websiteFallbacks = dedupeUrls([
    deriveWebsiteHome(companyWebsiteUrl),
    deriveWebsiteHome(companyCareersUrl),
    deriveWebsiteHome(applyUrl),
    deriveWebsiteHome(sourceUrl),
  ]);

  const primaryApplyUrl = [...directCandidates, ...atsBoardCandidates, ...websiteFallbacks][0] ?? null;

  const primaryApplyLabel =
    primaryApplyUrl === applyUrl
      ? "Apply"
      : primaryApplyUrl === companyCareersUrl || atsBoardCandidates.includes(primaryApplyUrl)
        ? "Company careers"
        : primaryApplyUrl === companyWebsiteUrl || websiteFallbacks.includes(primaryApplyUrl)
          ? "Company home"
          : primaryApplyUrl === sourceUrl
            ? "Open listing"
            : "Open role";

  return {
    primaryApplyUrl,
    primaryApplyLabel,
    sourceUrl,
    companyCareersUrl: companyCareersUrl ?? atsBoardCandidates[0] ?? null,
    companyWebsiteUrl: companyWebsiteUrl ?? websiteFallbacks[0] ?? null,
    hasReliableApplyLink: Boolean(primaryApplyUrl),
  };
}
