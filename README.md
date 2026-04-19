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
