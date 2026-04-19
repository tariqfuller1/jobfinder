import { prisma } from "../lib/db";
import { importBundledStarterData } from "../lib/starter-data";

async function main() {
  const result = await importBundledStarterData();
  console.log(`Imported or updated ${result.importedCompanies} companies from starter company data.`);
  console.log(`Removed ${result.removedJobs} bundled starter jobs so only live synced jobs remain.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
