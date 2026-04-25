import { prisma } from "../lib/db";
import { syncAllJobs } from "../lib/jobs";
import { discoverSourcesForAllCompanies } from "../lib/source-discovery";
import { removeBundledStarterJobs } from "../lib/starter-data";

async function main() {
  const cleanup = await removeBundledStarterJobs();
  console.log(`Removed ${cleanup.removedJobs} bundled starter jobs before live sync.`);
  const discovery = await discoverSourcesForAllCompanies();
  console.log(`Auto-discovered ${discovery.filter((row) => row.discovered).length} company sources before sync.`);
  const results = await syncAllJobs();
  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
