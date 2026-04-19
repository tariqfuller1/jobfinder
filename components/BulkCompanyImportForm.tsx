"use client";

import { useMemo, useState } from "react";

const sampleCsv = `name,slug,websiteUrl,careersUrl,headquarters,locations,remotePolicy,companyCategory,companySize,stackTags,gameTags,roleFocusTags,industryTags,atsProviders,emailPatterns,linkedinUrl,sourceType,sourceToken,activeHiring,notes,outreachTips
Epic Games,epic-games,https://www.epicgames.com,https://www.epicgames.com/site/en-US/careers/jobs,"Cary, NC","Cary, NC|Remote US",FLEXIBLE,GAMING,5000+,"C++|Unreal Engine|Tools","Engine|Gameplay","Gameplay programmer|Tools engineer","Game development|Engine technology",GREENHOUSE,first.last@epicgames.com,https://www.linkedin.com/company/epic-games/,GREENHOUSE,epicgames,true,"NC engine and gameplay target","Mention movement systems, tools, and player feel work."
Pendo,pendo,https://www.pendo.io,https://www.pendo.io/careers/,"Raleigh, NC","Raleigh, NC|Remote US",HYBRID,SOFTWARE,1000-5000,"React|TypeScript|Backend",,"Frontend engineer|Full stack engineer","Product software|Analytics",GREENHOUSE,,https://www.linkedin.com/company/pendo-io/,GREENHOUSE,pendo,true,"Good NC product engineering target","Lead with HCI and polished frontend work."`;

const bundledCsvPath = "/imports/us-software-gaming-company-master-2026-04-11.csv";

type ImportSummary = {
  importedCount: number;
  syncedCount: number;
  syncSummary: Array<{
    company: string;
    sourceType: string | null;
    sourceToken: string | null;
    jobsFetched: number;
    jobsImported: number;
    skipped: boolean;
    error?: string;
  }>;
};

function splitCsvIntoChunks(csvText: string, rowsPerChunk: number) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const header = lines[0];
  const rows = lines.slice(1);
  const chunks: string[] = [];
  for (let index = 0; index < rows.length; index += rowsPerChunk) {
    chunks.push([header, ...rows.slice(index, index + rowsPerChunk)].join("\n"));
  }
  return chunks;
}

export function BulkCompanyImportForm() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rowCount = useMemo(() => Math.max(0, csvText.split(/\r?\n/).filter(Boolean).length - 1), [csvText]);

  async function importChunk(chunkCsv: string) {
    const response = await fetch("/api/companies/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: chunkCsv }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Import failed");
    }

    return payload as ImportSummary;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProgress(null);
    setResult(null);

    try {
      const chunks = splitCsvIntoChunks(csvText, 50);
      const aggregate: ImportSummary = {
        importedCount: 0,
        syncedCount: 0,
        syncSummary: [],
      };

      for (let index = 0; index < chunks.length; index += 1) {
        setProgress(`Importing batch ${index + 1} of ${chunks.length}...`);
        const payload = await importChunk(chunks[index]);
        aggregate.importedCount += payload.importedCount;
        aggregate.syncedCount += payload.syncedCount;
        aggregate.syncSummary.push(...payload.syncSummary);
      }

      setProgress(null);
      setResult(aggregate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadBundledCsv() {
    setError(null);
    setProgress("Loading bundled CSV...");
    try {
      const response = await fetch(bundledCsvPath, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load bundled CSV");
      const text = await response.text();
      setCsvText(text);
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Could not load bundled CSV");
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setCsvText(text);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file");
    }
  }

  return (
    <div className="stack">
      <form onSubmit={handleSubmit} className="card stack">
        <div className="space-between">
          <div>
            <h2 className="section-title">Bulk company import</h2>
            <p className="muted">
              Paste CSV rows here or load the bundled 1,600+ company dataset. Imports run in 50-row batches so large files can also sync jobs for supported ATS companies.
            </p>
          </div>
          <span className="badge">{rowCount.toLocaleString()} rows</span>
        </div>

        <div className="actions">
          <button type="button" className="button secondary" onClick={loadBundledCsv} disabled={loading}>
            Load bundled 1,600+ company CSV
          </button>
          <a className="button secondary" href={bundledCsvPath} download>
            Download bundled CSV
          </a>
          <label className="button secondary" style={{ cursor: "pointer" }}>
            Upload CSV file
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
        </div>

        <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} rows={18} />

        <div className="actions">
          <button type="submit" className="button" disabled={loading || rowCount === 0}>
            {loading ? "Importing..." : "Import companies and sync jobs"}
          </button>
          <button type="button" className="button secondary" onClick={() => setCsvText(sampleCsv)} disabled={loading}>
            Reset sample CSV
          </button>
        </div>

        <div className="inset-card stack compact-stack">
          <strong>Supported sourceType values</strong>
          <p className="muted">GREENHOUSE, LEVER, ASHBY, WORKABLE, RECRUITEE, REMOTIVE, GAMES_WORKBOOK</p>
          <p className="muted">
            If sourceType and sourceToken are blank, the importer will try to detect them from careersUrl for Greenhouse, Lever, Ashby, Workable, and Recruitee URLs.
          </p>
          <p className="muted">
            For the fastest local setup with the bundled data, use <code>npm run import:starter-data</code> to import the company CSV and pre-seed matching jobs in one shot.
          </p>
        </div>
      </form>

      {progress ? <div className="card"><p className="muted">{progress}</p></div> : null}
      {error ? <div className="card"><p className="muted">{error}</p></div> : null}

      {result ? (
        <section className="card stack">
          <h2 className="section-title">Latest import</h2>
          <p className="muted">
            Imported {result.importedCount.toLocaleString()} companies and ran targeted job sync for {result.syncedCount.toLocaleString()} of them.
          </p>
          <div className="stack compact-stack">
            {result.syncSummary.slice(0, 250).map((item) => (
              <div key={`${item.company}-${item.sourceToken ?? "none"}`} className="inset-card stack compact-stack">
                <strong>{item.company}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {item.skipped ? `Skipped. ${item.error}` : `${item.jobsImported} jobs imported${item.error ? ` • ${item.error}` : ""}`}
                </p>
                <div className="badges">
                  <span className="badge">{item.sourceType ?? "No source"}</span>
                  {item.sourceToken ? <span className="badge">{item.sourceToken}</span> : null}
                  <span className="badge">Fetched {item.jobsFetched}</span>
                </div>
              </div>
            ))}
            {result.syncSummary.length > 250 ? (
              <p className="muted">Showing the first 250 batch results. The full import still completed.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
