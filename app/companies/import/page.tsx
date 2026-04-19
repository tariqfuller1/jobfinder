import Link from "next/link";
import { BulkCompanyImportForm } from "@/components/BulkCompanyImportForm";

export default function CompanyImportPage() {
  return (
    <div className="stack" style={{ padding: "24px 0 40px" }}>
      <section className="card hero-card stack compact-stack">
        <h1 className="section-title">Import companies and pull jobs</h1>
        <p className="muted">
          Use this page to bulk-load software companies, game studios, or North Carolina targets. Any row with a supported ATS source and token will trigger a targeted job pull into your main jobs feed.
        </p>
        <p className="muted">
          A bundled starter company dataset ships with the app. It helps populate the company directory, but bundled example jobs are removed so the main job board only shows live synced roles. For the quickest local setup, run <code>npm run import:starter-data</code> after your Prisma migration.
        </p>
        <div className="actions">
          <Link href="/companies" className="button secondary">Back to companies</Link>
          <Link href="/jobs" className="button secondary">View jobs</Link>
          <a href="/imports/us-software-gaming-company-master-2026-04-11.csv" className="button secondary" download>
            Download starter CSV
          </a>
        </div>
      </section>

      <BulkCompanyImportForm />
    </div>
  );
}
