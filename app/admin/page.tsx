import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_EMAIL = "tariqfuller@gmail.com";

async function getAdminStats() {
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    usersToday,
    usersThisWeek,
    usersThisMonth,
    recentUsers,
    totalJobs,
    activeJobs,
    jobsToday,
    jobsBySource,
    recentSyncs,
    totalApplications,
    applicationsThisWeek,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: day } } }),
    prisma.user.count({ where: { createdAt: { gte: week } } }),
    prisma.user.count({ where: { createdAt: { gte: month } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, email: true, displayName: true, createdAt: true },
    }),
    prisma.job.count(),
    prisma.job.count({ where: { isActive: true } }),
    prisma.job.count({ where: { createdAt: { gte: day } } }),
    prisma.job.groupBy({ by: ["source"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.syncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { id: true, source: true, jobsFetched: true, jobsUpserted: true, startedAt: true, finishedAt: true, error: true },
    }),
    prisma.application.count(),
    prisma.application.count({ where: { createdAt: { gte: week } } }),
  ]);

  return {
    users: { total: totalUsers, today: usersToday, week: usersThisWeek, month: usersThisMonth, recent: recentUsers },
    jobs: { total: totalJobs, active: activeJobs, today: jobsToday, bySource: jobsBySource },
    syncs: recentSyncs,
    applications: { total: totalApplications, week: applicationsThisWeek },
  };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#f4f4f5", margin: "6px 0 2px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>}
    </div>
  );
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.email !== ADMIN_EMAIL) return notFound();

  const stats = await getAdminStats();

  return (
    <div className="stack page-stack-lg" style={{ padding: "28px 0 60px" }}>
      <div>
        <div className="eyebrow">Admin</div>
        <h1 className="section-title">Site overview</h1>
      </div>

      {/* Users */}
      <section className="stack">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#d4d4d8", margin: 0 }}>Users</h2>
        <div className="grid-4" style={{ gap: 12 }}>
          <StatCard label="Total users" value={stats.users.total} />
          <StatCard label="Signed up today" value={stats.users.today} />
          <StatCard label="This week" value={stats.users.week} />
          <StatCard label="This month" value={stats.users.month} />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
            Recent signups
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", color: "#6b7280", fontWeight: 500 }}>Email</th>
                <th style={{ padding: "10px 20px", textAlign: "left", color: "#6b7280", fontWeight: 500 }}>Name</th>
                <th style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280", fontWeight: 500 }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats.users.recent.map((u, i) => (
                <tr key={u.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 20px", color: "#d4d4d8" }}>{u.email}</td>
                  <td style={{ padding: "10px 20px", color: "#9ca3af" }}>{u.displayName ?? "—"}</td>
                  <td style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280" }}>{fmt(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Jobs */}
      <section className="stack">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#d4d4d8", margin: 0 }}>Jobs</h2>
        <div className="grid-4" style={{ gap: 12 }}>
          <StatCard label="Total jobs" value={stats.jobs.total.toLocaleString()} />
          <StatCard label="Active jobs" value={stats.jobs.active.toLocaleString()} />
          <StatCard label="Added today" value={stats.jobs.today.toLocaleString()} />
          <StatCard label="Tracker entries" value={stats.applications.total.toLocaleString()} sub={`${stats.applications.week} this week`} />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
            Jobs by source
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", color: "#6b7280", fontWeight: 500 }}>Source</th>
                <th style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280", fontWeight: 500 }}>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {stats.jobs.bySource.map((s, i) => (
                <tr key={s.source} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 20px", color: "#d4d4d8", fontFamily: "monospace", fontSize: 12 }}>{s.source}</td>
                  <td style={{ padding: "10px 20px", textAlign: "right", color: "#9ca3af" }}>{s._count.id.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sync history */}
      <section className="stack">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#d4d4d8", margin: 0 }}>Recent syncs</h2>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", color: "#6b7280", fontWeight: 500 }}>Source</th>
                <th style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280", fontWeight: 500 }}>Fetched</th>
                <th style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280", fontWeight: 500 }}>Upserted</th>
                <th style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280", fontWeight: 500 }}>Started</th>
                <th style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280", fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.syncs.map((s, i) => (
                <tr key={s.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 20px", color: "#d4d4d8", fontFamily: "monospace", fontSize: 12 }}>{s.source}</td>
                  <td style={{ padding: "10px 20px", textAlign: "right", color: "#9ca3af" }}>{s.jobsFetched}</td>
                  <td style={{ padding: "10px 20px", textAlign: "right", color: "#9ca3af" }}>{s.jobsUpserted}</td>
                  <td style={{ padding: "10px 20px", textAlign: "right", color: "#6b7280" }}>{fmt(s.startedAt)}</td>
                  <td style={{ padding: "10px 20px", textAlign: "right" }}>
                    {s.error
                      ? <span style={{ color: "#f87171", fontSize: 11 }}>error</span>
                      : s.finishedAt
                        ? <span style={{ color: "#4ade80", fontSize: 11 }}>ok</span>
                        : <span style={{ color: "#facc15", fontSize: 11 }}>running</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
