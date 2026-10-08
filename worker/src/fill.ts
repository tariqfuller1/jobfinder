import type { Locator, Page } from "playwright";
import type { Claim, Field } from "./types.js";

/** Escapes a value for use inside a double-quoted CSS attribute selector. */
function attr(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isBlank(value: Field["value"]) {
  return Array.isArray(value) ? value.length === 0 : !value.trim();
}

function values(field: Field) {
  return Array.isArray(field.value) ? field.value : [field.value];
}

/** The option labels for a choice field's selected values. */
function labels(field: Field) {
  return values(field).map((v) => field.options?.find((o) => o.value === v)?.label ?? v);
}

function resumeFile(claim: Claim) {
  if (!claim.resume) throw new Error("No resume file saved.");
  return {
    name: claim.resume.fileName,
    mimeType: claim.resume.mimeType,
    buffer: Buffer.from(claim.resume.base64, "base64"),
  };
}

/**
 * Opens a searchable dropdown (react-select style), types to filter, and picks
 * the matching option. With `firstMatch`, takes the first suggestion — used for
 * location autocompletes where the exact option text isn't known in advance.
 */
async function pickFromCombobox(page: Page, input: Locator, label: string, firstMatch = false) {
  await input.click();
  await input.fill("");
  await input.pressSequentially(label.slice(0, 40), { delay: 20 });
  const options = page.getByRole("option");
  await options.first().waitFor({ state: "visible", timeout: 10_000 });
  const exact = page.getByRole("option", { name: label, exact: true });
  if (!firstMatch && (await exact.count()) > 0) await exact.first().click();
  else await options.first().click();
}

// ── Greenhouse ──────────────────────────────────────────────────────────────

async function fillGreenhouse(page: Page, claim: Claim, problems: string[]) {
  for (const field of claim.fields) {
    if (isBlank(field.value)) continue;
    try {
      // Demographic questions use the bare question id; location has its own widget id.
      const id = field.key.startsWith("demographic_")
        ? field.key.slice("demographic_".length)
        : field.key === "location"
          ? "candidate-location"
          : field.key;
      const el = page.locator(`[id="${attr(id)}"]`).first();

      if (field.type === "file") {
        await el.setInputFiles(resumeFile(claim));
      } else if (field.key === "cover_letter_text") {
        const group = page.locator("#cover_letter").locator("xpath=ancestor::*[.//button[normalize-space()='Enter manually']][1]");
        await group.getByRole("button", { name: "Enter manually" }).click();
        await page.locator("#cover_letter_text").fill(String(field.value));
      } else if (field.type === "location") {
        await pickFromCombobox(page, el, String(field.value), true);
      } else if (field.type === "select" || field.type === "multiselect") {
        for (const label of labels(field)) await pickFromCombobox(page, el, label);
      } else {
        await el.fill(String(field.value));
      }
    } catch {
      problems.push(field.label);
    }
  }

  // Phone fields carry a country-code picker that defaults to blank on some boards.
  const country = page.locator("#country");
  if ((await country.count()) > 0 && !(await country.inputValue().catch(() => ""))) {
    await pickFromCombobox(page, country, claim.applicant?.country ?? "United States").catch(() => undefined);
  }
}

// ── Lever ───────────────────────────────────────────────────────────────────

async function fillLever(page: Page, claim: Claim, problems: string[]) {
  for (const field of claim.fields) {
    if (isBlank(field.value)) continue;
    const name = attr(field.key);
    try {
      if (field.type === "file") {
        await page.locator("#resume-upload-input").setInputFiles(resumeFile(claim));
        // Lever uploads the file right away and shows a success tick when it's stored.
        await page.locator(".resume-upload-success").first().waitFor({ state: "visible", timeout: 30_000 });
      } else if (field.type === "location") {
        const input = page.locator("#location-input");
        await input.fill("");
        await input.pressSequentially(String(field.value), { delay: 30 });
        const suggestion = page.locator(".dropdown-location, .dropdown-results").locator("div, li").first();
        await suggestion.waitFor({ state: "visible", timeout: 10_000 });
        await suggestion.click();
      } else if (field.type === "select" || field.type === "multiselect") {
        const select = page.locator(`select[name="${name}"]`);
        if ((await select.count()) > 0) {
          await select.selectOption(values(field)[0]);
        } else {
          // Demographic surveys only appear for the location picked inside them; optional ones that
          // stay hidden aren't shown to the applicant at all, so there's nothing to fill.
          const first = page.locator(`input[name="${name}"]`).first();
          if (!field.required && !(await first.isVisible().catch(() => false))) continue;
          // Radio buttons / checkboxes whose value is the option text.
          for (const value of values(field)) {
            await page.locator(`input[name="${name}"][value="${attr(value)}"]`).check();
          }
        }
      } else {
        await page.locator(`[name="${name}"]`).first().fill(String(field.value));
      }
    } catch {
      problems.push(field.label);
    }
  }
}

// ── Ashby ───────────────────────────────────────────────────────────────────

async function fillAshby(page: Page, claim: Claim, problems: string[]) {
  for (const field of claim.fields) {
    if (isBlank(field.value)) continue;
    const id = attr(field.key);
    // Every Ashby question is wrapped in a field-entry container labelled for its path.
    const container = page
      .locator(".ashby-application-form-field-entry, [class*='_fieldEntry_']")
      .filter({ has: page.locator(`label[for="${id}"]`) })
      .first();
    try {
      if (field.type === "file") {
        const file = resumeFile(claim);
        await page.locator(`input[type=file][id="${id}"]`).setInputFiles(file);
        // Ashby uploads in the background; the file name appears once it's stored.
        await container.getByText(file.name).first().waitFor({ state: "visible", timeout: 30_000 });
      } else if (field.type === "location") {
        await pickFromCombobox(page, container.getByRole("combobox"), String(field.value), true);
      } else if (field.type === "select" || field.type === "multiselect") {
        for (const label of labels(field)) {
          const radio = container.getByLabel(label, { exact: true });
          const button = container.getByRole("button", { name: label, exact: true });
          const combo = container.getByRole("combobox");
          if ((await radio.count()) > 0) await radio.first().check();
          else if ((await button.count()) > 0) await button.first().click(); // Yes / No questions
          else if ((await combo.count()) > 0) await pickFromCombobox(page, combo.first(), label);
          else throw new Error("no matching control");
        }
      } else {
        await page.locator(`[id="${id}"]`).first().fill(String(field.value));
      }
    } catch {
      problems.push(field.label);
    }
  }

  // Optional SMS-marketing consent some boards add outside the question list — always decline.
  const smsNo = page.locator("input[name=communicationConsent]").locator("xpath=..").filter({ hasText: /^No\b/ });
  if ((await smsNo.count()) > 0) await smsNo.first().locator("input").check().catch(() => undefined);
}

/** Closes cookie banners that would sit on top of the Submit button — declining where possible. */
async function dismissCookieBanner(page: Page) {
  for (const name of [/^(deny|reject( all)?|decline( all)?)$/i, /^(accept( all)?( cookies)?|ok|got it)$/i]) {
    const button = page.getByRole("button", { name }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
      return;
    }
  }
}

/** Fills every answered field. Returns the labels of fields that couldn't be filled. */
export async function fillForm(page: Page, claim: Claim): Promise<string[]> {
  const problems: string[] = [];
  await dismissCookieBanner(page);
  if (claim.ats === "greenhouse") await fillGreenhouse(page, claim, problems);
  else if (claim.ats === "lever") await fillLever(page, claim, problems);
  else await fillAshby(page, claim, problems);
  return problems;
}

export function submitButton(page: Page, ats: Claim["ats"]) {
  if (ats === "lever") return page.locator("#btn-submit, button[data-qa=btn-submit]").first();
  if (ats === "ashby") return page.getByRole("button", { name: /submit application/i }).first();
  return page.locator("button[type=submit]").filter({ hasText: /submit/i }).first();
}
