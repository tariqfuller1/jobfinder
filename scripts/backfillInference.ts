/**
 * One-time backfill: find every job in the DB that still has UNKNOWN for
 * workplaceType, employmentType, or experienceLevel and try to infer the real
 * value from its title + description.
 *
 * Run with:  npx tsx scripts/backfillInference.ts
 *
 * Safe to run multiple times — only updates rows that are still UNKNOWN.
 */

import { PrismaClient } from "@prisma/client";
import { inferWorkplaceType, inferEmploymentType, inferExperienceLevel } from "../lib/infer";

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { workplaceType: "UNKNOWN" },
        { employmentType: "UNKNOWN" },
        { experienceLevel: "UNKNOWN" },
      ],
    },
    select: {
      id: true,
      title: true,
      descriptionText: true,
      workplaceType: true,
      employmentType: true,
      experienceLevel: true,
    },
  });

  console.log(`Found ${jobs.length} jobs with at least one UNKNOWN field.`);

  let updated = 0;
  let skipped = 0;

  for (const job of jobs) {
    const patch: Record<string, string> = {};

    if (job.workplaceType === "UNKNOWN") {
      const v = inferWorkplaceType(job.title, job.descriptionText);
      if (v) patch.workplaceType = v;
    }
    if (job.employmentType === "UNKNOWN") {
      const v = inferEmploymentType(job.title, job.descriptionText);
      if (v) patch.employmentType = v;
    }
    if (job.experienceLevel === "UNKNOWN") {
      const v = inferExperienceLevel(job.title, job.descriptionText);
      if (v) patch.experienceLevel = v;
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    await prisma.job.update({ where: { id: job.id }, data: patch as never });
    updated++;
  }

  console.log(`Done. Updated: ${updated}, no inference possible: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
