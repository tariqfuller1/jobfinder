import { prisma } from "../lib/db";
import { syncAllJobs } from "../lib/jobs";
import { discoverSourcesForAllCompanies } from "../lib/source-discovery";
import { removeBundledStarterJobs } from "../lib/starter-data";

// ─── helpers ────────────────────────────────────────────────────────────────

function elapsed(start: number) {
  const ms = Date.now() - start;
  if (ms < 1000) return `\x1b[2m${ms}ms\x1b[0m`;
  return `\x1b[2m${(ms / 1000).toFixed(1)}s\x1b[0m`;
}

function fmtSecs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function bar(done: number, total: number, width = 24) {
  const pct = total === 0 ? 1 : done / total;
  const filled = Math.round(pct * width);
  const pctStr = `${Math.round(pct * 100)}%`.padStart(4);
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}] ${pctStr}  ${done}/${total}`;
}

function overwrite(line: string) {
  process.stdout.write(`\r\x1b[K${line}`);
}

function println(line: string) {
  process.stdout.write(`\r\x1b[K${line}\n`);
}

function header(title: string) {
  const line = "─".repeat(56);
  console.log(`\n\x1b[1m${line}\x1b[0m`);
  console.log(`\x1b[1m  ${title}\x1b[0m`);
  console.log(`\x1b[1m${line}\x1b[0m`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const totalStart = Date.now();
  console.log("\x1b[1m\x1b[36m\n  Job Finder — Sync\x1b[0m");
  console.log("  Refreshing all job sources.\n");

  // ── Cleanup stale bundled jobs ─────────────────────────────────────────────
  const cleanup = await removeBundledStarterJobs();
  if (cleanup.removedJobs > 0) {
    console.log(`  Removed ${cleanup.removedJobs} stale bundled jobs.\n`);
  }

  // ── Step 1: Discover new ATS sources ──────────────────────────────────────
  header("Step 1 / 2  —  Discover new ATS sources");
  console.log("  Scanning career pages for Greenhouse / Lever / Ashby …\n");

  const s1 = Date.now();
  let discovered = 0;
  let discoveryErrors = 0;

  await discoverSourcesForAllCompanies({
    onProgress: ({ index, total, company, result }) => {
      if (result.discovered) discovered++;
      if (result.error) discoveryErrors++;

      const status = result.discovered
        ? `\x1b[32m✓\x1b[0m ${(result.sourceType ?? "?").toLowerCase().padEnd(10)}`
        : result.error
          ? `\x1b[31m✗\x1b[0m ${"error".padEnd(10)}`
          : `\x1b[2m–\x1b[0m ${"no match".padEnd(10)}`;

      overwrite(`  ${bar(index + 1, total)}  ${status}  \x1b[2m${company.slice(0, 28)}\x1b[0m`);
    },
  });

  println(
    `  ✓ ${discovered} new source${discovered !== 1 ? "s" : ""} found  ·  ${discoveryErrors} errors  ${elapsed(s1)}`,
  );

  // ── Step 2: Sync all sources ───────────────────────────────────────────────
  header("Step 2 / 2  —  Sync all sources");
  console.log();

  const s2 = Date.now();
  let totalNew = 0;
  let totalFetched = 0;
  let failures = 0;

  // Track current source + start time so the timer can update the line.
  let currentSource = "";
  let sourceStart = Date.now();
  let completedSoFar = 0;
  let sourcesTotal = 0;
  let timerRef: ReturnType<typeof setInterval> | null = null;

  function startTimer(source: string, index: number, total: number) {
    currentSource = source;
    sourceStart = Date.now();
    completedSoFar = index;
    sourcesTotal = total;
    if (timerRef) clearInterval(timerRef);
    timerRef = setInterval(() => {
      const waiting = fmtSecs(Date.now() - sourceStart);
      overwrite(
        `  \x1b[33m→\x1b[0m ${bar(completedSoFar, sourcesTotal)}  \x1b[2mfetching\x1b[0m  \x1b[1m${currentSource.slice(0, 30)}\x1b[0m  \x1b[33m${waiting}\x1b[0m`,
      );
    }, 500);
  }

  function stopTimer() {
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
  }

  await syncAllJobs(
    (result, completed, total, _runningFetched, runningUpserted) => {
      stopTimer();
      if (result.ok) {
        totalNew += result.jobsUpserted;
        totalFetched += result.jobsFetched;
        println(
          `  \x1b[32m✓\x1b[0m ${bar(completed, total)}  \x1b[1m${result.source.padEnd(32)}\x1b[0m` +
          `  \x1b[32m${String(result.jobsUpserted).padStart(4)} new\x1b[0m  /  ${String(result.jobsFetched).padStart(4)} fetched` +
          `  \x1b[2m${runningUpserted} total\x1b[0m`,
        );
      } else {
        failures++;
        println(
          `  \x1b[31m✗\x1b[0m ${bar(completed, total)}  \x1b[1m${result.source.padEnd(32)}\x1b[0m` +
          `  \x1b[31m${(result.error ?? "failed").slice(0, 40)}\x1b[0m`,
        );
      }
    },
    (source, index, total) => {
      startTimer(source, index, total);
    },
  );

  stopTimer();

  const totalJobs = await prisma.job.count({ where: { isActive: true } });
  const totalTime = fmtSecs(Date.now() - totalStart);

  const line = "─".repeat(56);
  console.log(`\n\x1b[1m${line}\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m  ✓ Sync complete  —  ${totalTime}\x1b[0m`);
  console.log(`\x1b[1m${line}\x1b[0m`);
  console.log(`\n  \x1b[32m\x1b[1m${totalNew}\x1b[0m new jobs saved`);
  console.log(`  \x1b[1m${totalFetched}\x1b[0m total fetched  ·  \x1b[1m${failures}\x1b[0m failures`);
  console.log(`  \x1b[1m${totalJobs}\x1b[0m active jobs in database\n`);
}

main()
  .catch((error) => {
    console.error("\n\x1b[31m✗ Sync failed:\x1b[0m", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
