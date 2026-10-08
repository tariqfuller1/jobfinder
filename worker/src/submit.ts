import type { Browser, Page } from "playwright";
import { fillForm, submitButton } from "./fill.js";
import type { Claim, SubmitResult } from "./types.js";

const SUCCESS_TEXT =
  /thank(s| you) for (applying|your application|your interest)|application (was |has been )?(submitted|received)|we('ve| have) received your application/gi;

async function successMentions(page: Page) {
  const body = await page.locator("body").innerText().catch(() => "");
  return body.match(SUCCESS_TEXT)?.length ?? 0;
}

async function screenshot(page: Page, fullPage = false) {
  const png = await page.screenshot({ fullPage, type: "png" }).catch(() => null);
  return png ? png.toString("base64") : undefined;
}

/** A visible CAPTCHA challenge (not the invisible badge). Hyrd never tries to solve these. */
async function captchaChallengeVisible(page: Page) {
  const frames = page.locator(
    "iframe[src*='hcaptcha.com'][src*='challenge'], iframe[title*='challenge' i][src*='recaptcha'], iframe[src*='recaptcha'][src*='bframe']",
  );
  const count = await frames.count();
  for (let i = 0; i < count; i++) {
    if (await frames.nth(i).isVisible().catch(() => false)) return true;
  }
  return false;
}

async function validationErrors(page: Page) {
  const texts = await page
    .locator("[role=alert], .error, .error-message, [class*='error' i]:not(script):not(style)")
    .allInnerTexts()
    .catch(() => [] as string[]);
  return [...new Set(texts.map((t) => t.trim()).filter((t) => t && t.length < 200))].slice(0, 5);
}

type Outcome = "success" | "captcha" | "errors" | "unknown";

// Job descriptions often say "thank you for your interest", so success means
// more of those phrases than were on the page before Submit was clicked.
async function waitForOutcome(page: Page, startUrl: string, mentionsBefore: number): Promise<Outcome> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (page.url() !== startUrl && /thank|confirm|success|submitted/i.test(page.url())) return "success";
    if ((await successMentions(page)) > mentionsBefore) return "success";
    if (await captchaChallengeVisible(page)) return "captcha";
    if ((await page.locator("[aria-invalid=true]").count().catch(() => 0)) > 0) return "errors";
    await page.waitForTimeout(1000);
  }
  return (await validationErrors(page)).length ? "errors" : "unknown";
}

/**
 * Fills and submits one application. With `dryRun`, stops before clicking
 * Submit and returns the filled form's screenshot.
 */
export async function submitApplication(browser: Browser, claim: Claim, { dryRun = false } = {}): Promise<SubmitResult> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
  const page = await context.newPage();
  // Fail fast on a missing control instead of Playwright's 30s default per action.
  page.setDefaultTimeout(8_000);
  try {
    await page.goto(claim.formUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

    // Greenhouse and some Ashby boards show the description first with an Apply button.
    const apply = page.getByRole("button", { name: /^apply( for this job)?$/i }).first();
    if (claim.ats === "greenhouse" && (await apply.isVisible().catch(() => false))) {
      await apply.click().catch(() => undefined);
    }

    const problems = await fillForm(page, claim);
    const required = new Set(claim.fields.filter((f) => f.required).map((f) => f.label));
    const blocking = problems.filter((label) => required.has(label));

    if (dryRun) {
      return {
        status: "NEEDS_MANUAL",
        error: problems.length ? `Dry run — couldn't fill: ${problems.join("; ")}` : "Dry run — everything filled.",
        screenshotBase64: await screenshot(page, true),
      };
    }

    if (blocking.length) {
      return {
        status: "NEEDS_MANUAL",
        error: `Couldn't fill ${blocking.length === 1 ? "a required question" : "some required questions"} on the form: ${blocking.join("; ")}.`,
        screenshotBase64: await screenshot(page, true),
      };
    }

    const startUrl = page.url();
    const mentionsBefore = await successMentions(page);
    await submitButton(page, claim.ats).click({ timeout: 10_000 });
    const outcome = await waitForOutcome(page, startUrl, mentionsBefore);

    if (outcome === "success") return { status: "SUBMITTED", screenshotBase64: await screenshot(page) };
    if (outcome === "captcha") {
      return {
        status: "NEEDS_MANUAL",
        error: "The company's form asked for a CAPTCHA check, which only you can complete.",
        screenshotBase64: await screenshot(page),
      };
    }
    if (outcome === "errors") {
      const errors = await validationErrors(page);
      return {
        status: "NEEDS_MANUAL",
        error: `The form didn't accept the submission${errors.length ? `: ${errors.join("; ")}` : "."}`,
        screenshotBase64: await screenshot(page, true),
      };
    }
    return {
      status: "NEEDS_MANUAL",
      error: "Hyrd clicked Submit but couldn't confirm it went through. Check your email for a confirmation before applying again.",
      screenshotBase64: await screenshot(page, true),
    };
  } catch (err) {
    return {
      status: "FAILED",
      error: err instanceof Error ? err.message.split("\n")[0].slice(0, 300) : "Unexpected error.",
      screenshotBase64: await screenshot(page, true),
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}
