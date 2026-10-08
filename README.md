# Job Finder App

A Next.js + Prisma app for finding software and game jobs, tracking applications, importing your resume for better matching, researching companies, and planning cold outreach.

## What changed

- Every job now resolves to a real apply destination. The app prefers the direct posting, then the company ATS board, then the company home page. It no longer falls back to generic ATS provider home pages like bare Lever, Ashby, Greenhouse, or Workable roots.
- Resume import is built in at `/profile`. Upload a PDF, DOCX, TXT, or paste resume text and the app will extract schools, skills, locations, and connection keywords.
- Added account registration and sign-in, with password-based sessions stored in the app. Each account now has its own saved profile, resume, preferences, and tracker.
- Added a full resume rewriter at `/resume-rewrite` so you can generate a job-specific tailored resume draft instead of only getting bullet suggestions.
- Best-fit scoring uses your imported profile instead of only relying on a hardcoded résumé snapshot.
- Company pages and job detail pages generate resume-based connection searches, such as alumni and shared-background searches.
- The jobs board has real pagination so you can move through very large datasets.
- Bootstrapping now imports bundled company data, removes all bundled example jobs, auto-discovers ATS providers from company career pages, and then layers on live ATS syncs. If one live source fails, the rest still load.
- The sync layer now combines configured ATS tokens with source tokens discovered from company career pages, plus broader public feeds like Remotive, Games Workbook, and Arbeitnow. USAJOBS support is included when you add your own API credentials.
- Added a real logged-out landing page at `/` and a separate signed-in dashboard at `/dashboard`.

## Recommended local setup

From the project folder, run these commands in order:

```bash
npm install
npm run setup:db
npm run prisma:seed
npm run bootstrap
npm run dev
```

For a refresh later, you can run:

```bash
npm run discover:sources
npm run sync:jobs
```

Then open `http://localhost:3000`.

## Troubleshooting: npm install is slow or hangs

If `npm install` hangs or times out, it almost always means the `package-lock.json`
was generated in a different environment (e.g. inside ChatGPT) and its resolved URLs
point to an internal registry unreachable from your machine.

**Fix — delete the lockfile and reinstall:**

```bash
npm run fresh
# or manually:
rm -rf node_modules package-lock.json
npm install
```

This regenerates a clean lockfile pointing to the public npm registry.
The included `.npmrc` also disables audit/fund network calls that add seconds to every install.

## Helpful commands

```bash
npm run setup:env          # create .env from .env.example if missing
npm run setup:db           # prisma generate + prisma db push
npm run prisma:seed        # seed starter contacts and profile defaults
npm run import:starter-data # import bundled company directory data and remove bundled example jobs
npm run discover:sources   # scan company sites and careers pages for supported ATS boards
npm run sync:jobs          # remove bundled example jobs, auto-discover sources, and sync live feeds
npm run bootstrap          # import bundled companies, remove example jobs, then sync live sources
npm run dev
```

## Key pages

- `/` logged-out landing page (signed-in users are sent to `/dashboard`)
- `/dashboard` signed-in dashboard
- `/jobs` live jobs board
- `/recommended` best-fit dashboard
- `/profile` resume import and parsed match profile
- `/companies` company and outreach hub
- `/companies/import` bulk import + starter company CSV loader
- `/tracker` application tracker
- `/cover-letters` tailored cover letter drafts
- `/resume-feedback` role-specific resume tips
- `/resume-rewrite` full resume rewrite drafts
- `/login` and `/register` account access

## Auto-apply

`/auto-apply` lets users apply to Greenhouse, Lever, and Ashby jobs from the job page.

1. **Prepare** (in the web app). The application form is read without a browser:
   - Greenhouse: through the public board API.
   - Lever: from its server-rendered apply page.
   - Ashby: through the public GraphQL endpoint its hosted form uses.

   Answers are filled from the profile and the user's saved answers (`lib/auto-apply/answers.ts`). Required open-ended questions go to Groq (`lib/auto-apply/ai.ts`). Legal and self-ID questions (work authorization, sponsorship, EEO) and personal facts (salary, notice period) are never sent to AI. They come from saved answers or the user.
2. **Review**. The user checks and edits every answer at `/auto-apply/[id]`, then clicks Submit. That marks the application `QUEUED`. A per-user daily cap (`AUTO_APPLY_DAILY_LIMIT`) applies.
3. **Submit** (in `worker/`, a separate service). The worker polls `/api/internal/auto-apply/claim`, fills the real form in headless Chromium, clicks Submit, and reports the result. A success adds the job to the tracker as Applied. If the form shows a CAPTCHA challenge or rejects the submission, the application goes back to the user as "Finish manually", with their answers ready to copy. The worker never tries to solve CAPTCHAs.

### Deploying the worker on Railway

The worker needs its own service because Chromium is too heavy to share the web app's memory, and SQLite on the volume can only be reached through the app's API.

1. Generate a long random secret and set `AUTO_APPLY_WORKER_SECRET` to it on the web service.
2. Add a new service from the same repo and set its **Root Directory** to `worker`. Railway builds `worker/Dockerfile`.
3. Set these variables on the worker:
   - `HYRD_API_URL`: the site's URL, for example `https://hyrdjobfinder.com`.
   - `AUTO_APPLY_WORKER_SECRET`: the same value as on the web service.
4. Optionally set `DRY_RUN=true` on the worker for a first deploy. It fills forms but never clicks Submit, and every application comes back as "Finish manually" with a screenshot.

Without `AUTO_APPLY_WORKER_SECRET`, users can still prepare and review applications, but approved ones stay queued.

To check the selectors after an ATS changes its form (fills the live form, saves a screenshot, never submits):

```bash
cd worker && npm install && npx playwright install chromium
npm run dry-run -- claim.json resume.pdf --headed
```

## Notes

- Bundled CSV files are only used for company directory data. The app removes bundled example jobs and populates the jobs board from synced live sources only.
- Live sync coverage now comes from both configured tokens and auto-discovered company ATS sources. Public-feed coverage also includes Remotive, Games Workbook, and Arbeitnow by default. USAJOBS can be enabled with your own API key and email.
- LinkedIn lookups remain user-driven. The app generates targeted searches instead of scraping profiles.

## Troubleshooting

If Prisma fails during install or generate on your machine:

```bash
rm -rf node_modules package-lock.json
npm install
npm run setup:db
```

If the site opens but the job board is empty:

```bash
npm run prisma:seed
npm run bootstrap
# or run only live syncs
npm run sync:jobs
```

If some live sources fail during bootstrap, keep going. The app now keeps successful live sources and removes bundled example jobs instead of aborting the whole refresh.
