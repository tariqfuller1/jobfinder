import { prisma } from "../lib/db";
import { syncJobsForCompanies } from "../lib/company-import";
import { syncAllJobs } from "../lib/jobs";
import { discoverSourcesForAllCompanies } from "../lib/source-discovery";
import { importBundledStarterData } from "../lib/starter-data";

// ─── helpers ────────────────────────────────────────────────────────────────

function elapsed(start: number) {
  const s = ((Date.now() - start) / 1000).toFixed(1);
  return `\x1b[2m${s}s\x1b[0m`;
}

function bar(done: number, total: number, width = 28) {
  const pct = total === 0 ? 1 : done / total;
  const filled = Math.round(pct * width);
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}] ${done}/${total}`;
}

function overwrite(line: string) {
  process.stdout.write(`\r\x1b[K${line}`);
}

function println(line: string) {
  process.stdout.write(`\r\x1b[K${line}\n`);
}

function header(title: string) {
  const line = "─".repeat(52);
  console.log(`\n\x1b[1m${line}\x1b[0m`);
  console.log(`\x1b[1m  ${title}\x1b[0m`);
  console.log(`\x1b[1m${line}\x1b[0m`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const totalStart = Date.now();
  console.log("\x1b[1m\x1b[36m\n  Job Finder Bootstrap\x1b[0m");
  console.log("  Setting up your database and pulling live jobs.\n");

  // ── Stage 1: Import bundled companies ─────────────────────────────────────
  header("Stage 1 / 4  —  Import bundled companies");
  const s1 = Date.now();
  process.stdout.write("  Loading company CSV ...");
  const starter = await importBundledStarterData();
  println(
    `  ✓ ${starter.importedCompanies} companies imported  ·  ${starter.removedJobs} stale jobs removed  ${elapsed(s1)}`,
  );

  // ── Stage 2: Discover ATS sources ─────────────────────────────────────────
  header("Stage 2 / 4  —  Discover job-board sources");
  console.log("  Scanning company career pages for Greenhouse / Lever / Ashby …\n");
  const s2 = Date.now();

  let discovered = 0;
  let discoveryErrors = 0;

  await discoverSourcesForAllCompanies({
    onProgress: ({ index, total, company, result }) => {
      if (result.discovered) discovered++;
      if (result.error) discoveryErrors++;

      const pct = Math.round(((index + 1) / total) * 100);
      const status = result.discovered
        ? `\x1b[32m✓\x1b[0m ${result.sourceType?.toLowerCase()}`
        : result.error
          ? `\x1b[31m✗\x1b[0m timeout`
          : `\x1b[2m–\x1b[0m no match`;

      overwrite(
        `  ${bar(index + 1, total)}  ${pct}%   ${status}  \x1b[2m${company.slice(0, 26)}\x1b[0m`,
      );
    },
  });

  println(
    `  ✓ ${discovered} sources discovered  ·  ${discoveryErrors} errors  ${elapsed(s2)}`,
  );

  // ── Stage 3: Sync jobs from discovered company sources ────────────────────
  header("Stage 3 / 4  —  Sync company ATS boards");
  const s3 = Date.now();

  const companiesWithSources = await prisma.company.findMany({
    where: {
      sourceType: { not: null },
      sourceToken: { not: null },
    },
  });

  if (companiesWithSources.length === 0) {
    println("  – No company ATS sources found, skipping.");
  } else {
    console.log(`  Fetching jobs from ${companiesWithSources.length} company ATS boards …\n`);
    let totalImported = 0;
    let companyFailures = 0;

    await syncJobsForCompanies(companiesWithSources, ({ index, total, company, jobsImported, skipped, error }) => {
      if (!skipped && !error) totalImported += jobsImported;
      if (error) companyFailures++;

      const status = skipped
        ? `\x1b[2m–\x1b[0m skipped`
        : error
          ? `\x1b[31m✗\x1b[0m error`
          : `\x1b[32m✓\x1b[0m ${jobsImported} jobs`;

      overwrite(
        `  ${bar(index + 1, total)}  ${Math.round(((index + 1) / total) * 100)}%   ${status}  \x1b[2m${company.slice(0, 26)}\x1b[0m`,
      );
    });

    println(
      `  ✓ ${totalImported} jobs imported  ·  ${companyFailures} failures  ${elapsed(s3)}`,
    );
  }

  // ── Stage 4: Sync live public feeds ───────────────────────────────────────
  header("Stage 4 / 4  —  Sync live public feeds");
  console.log("  Pulling from Remotive, Games Workbook, Arbeitnow, and configured ATS tokens …\n");
  const s4 = Date.now();

  let liveTotal = 0;
  let liveFetched = 0;
  let liveFailures = 0;

  await syncAllJobs(
    (result, completed, total, runningFetched, runningUpserted) => {
      if (result.ok) {
        liveTotal += result.jobsUpserted;
        liveFetched += result.jobsFetched;
        println(
          `  \x1b[32m✓\x1b[0m ${bar(completed, total)}  \x1b[1m${result.source.padEnd(32)}\x1b[0m` +
          `  ${String(result.jobsUpserted).padStart(4)} new  /  ${String(result.jobsFetched).padStart(4)} fetched` +
          `  \x1b[2m(${runningUpserted} total new)\x1b[0m`,
        );
      } else {
        liveFailures++;
        println(
          `  \x1b[31m✗\x1b[0m ${bar(completed, total)}  \x1b[1m${result.source.padEnd(32)}\x1b[0m` +
          `  \x1b[31m${result.error ?? "failed"}\x1b[0m`,
        );
      }
    },
    (source, index, total) => {
      overwrite(
        `  \x1b[33m→\x1b[0m ${bar(index, total)}  \x1b[2mfetching  ${source.slice(0, 34)}\x1b[0m`,
      );
    },
  );

  println(
    `\n  ✓ ${liveTotal} new jobs  ·  ${liveFetched} fetched  ·  ${liveFailures} failures  ${elapsed(s4)}`,
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalJobs = await prisma.job.count({ where: { isActive: true } });
  const totalCompanies = await prisma.company.count();

  const line = "─".repeat(52);
  console.log(`\n\x1b[1m\x1b[36m${line}\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m  ✓ Bootstrap complete  ${elapsed(totalStart)}\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m${line}\x1b[0m`);
  console.log(`\n  \x1b[1m${totalJobs}\x1b[0m active jobs`);
  console.log(`  \x1b[1m${totalCompanies}\x1b[0m companies\n`);
  console.log(`  Run \x1b[1mnpm run dev\x1b[0m then open \x1b[1mhttp://localhost:3000\x1b[0m\n`);
}

main()
  .catch((error) => {
    console.error("\n\x1b[31m✗ Bootstrap failed:\x1b[0m", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
