import { prisma } from "../lib/db";
import { discoverSourcesForAllCompanies } from "../lib/source-discovery";

async function main() {
  const results = await discoverSourcesForAllCompanies();
  const discovered = results.filter((row) => row.discovered).length;
  const errors = results.filter((row) => row.error).length;
  console.log(`Discovered ${discovered} company ATS sources.`);
  if (errors) {
    console.log(`Source discovery errors: ${errors}`);
  }
  console.log(JSON.stringify(results.slice(0, 50), null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
