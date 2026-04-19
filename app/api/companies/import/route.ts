import { NextResponse } from "next/server";
import { z } from "zod";
import { importCompaniesAndSync } from "@/lib/company-import";

const schema = z.object({
  csvText: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await importCompaniesAndSync(body.csvText);
    return NextResponse.json({
      importedCount: result.importedCount,
      syncedCount: result.syncedCount,
      discoverySummary: result.discoverySummary,
      syncSummary: result.syncSummary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 400 },
    );
  }
}
