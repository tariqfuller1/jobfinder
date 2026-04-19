import { TrackerTable } from "@/components/TrackerTable";
import { requireCurrentUser } from "@/lib/auth";
import { listApplications } from "@/lib/tracker";

export default async function TrackerPage() {
  const user = await requireCurrentUser();
  const applications = await listApplications(user.id);
  const activeRows = applications.filter((row) => row.status !== "REJECTED" && row.status !== "OFFER").length;

  return (
    <div style={{ padding: "24px 0 40px" }} className="stack page-stack-lg">
      <section className="hero-grid card hero-card">
        <div className="stack compact-stack hero-copy">
          <div className="eyebrow">Pipeline management</div>
          <h1 className="section-title">Keep your applications organized</h1>
          <p className="muted hero-lead">This tracker belongs to your signed-in account, so your saved applications stay separate and you can manage your pipeline from one dashboard.</p>
        </div>
        <div className="hero-panel stack compact-stack">
          <div className="metric-grid metric-grid-tight">
            <div className="metric-card inset-card">
              <div className="metric-label">Tracked applications</div>
              <div className="metric-value">{applications.length}</div>
              <div className="metric-note">Saved to this account</div>
            </div>
            <div className="metric-card inset-card">
              <div className="metric-label">Active pipeline</div>
              <div className="metric-value">{activeRows}</div>
              <div className="metric-note">Not closed out yet</div>
            </div>
          </div>
        </div>
      </section>
      <div className="card">
        <TrackerTable initialRows={applications} />
      </div>
    </div>
  );
}
