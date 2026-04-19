import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { bulkImportCompaniesFromCsv } from "@/lib/company-import";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((item) => item.replace(/^"|"$/g, ""));
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] ?? "");
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function loadBundledStarterJobUrls(root = process.cwd()) {
  const jobsPath = path.join(root, "public", "imports", "us-software-gaming-job-seed-2026-04-11.csv");
  const jobsCsv = await fs.readFile(jobsPath, "utf8");
  const jobs = parseCsv(jobsCsv);
  return jobs
    .map((row) => row.url?.trim())
    .filter((value): value is string => Boolean(value));
}

export async function removeBundledStarterJobs(root = process.cwd()) {
  const starterUrls = await loadBundledStarterJobUrls(root);
  if (!starterUrls.length) {
    return { removedJobs: 0 };
  }

  const deletion = await prisma.job.deleteMany({
    where: {
      OR: [
        { externalId: { in: starterUrls } },
        { applyUrl: { in: starterUrls } },
      ],
    },
  });

  return { removedJobs: deletion.count };
}

export async function importBundledStarterData(root = process.cwd()) {
  const companyPath = path.join(root, "public", "imports", "us-software-gaming-company-master-2026-04-11.csv");
  const companyCsv = await fs.readFile(companyPath, "utf8");
  const importedCompanies = await bulkImportCompaniesFromCsv(companyCsv);
  const cleanup = await removeBundledStarterJobs(root);

  return {
    importedCompanies: importedCompanies.length,
    importedJobs: 0,
    removedJobs: cleanup.removedJobs,
  };
}
