import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MatchReasons } from "@/components/MatchReasons";

export type JobCardData = {
  id: string;
  title: string;
  company: string;
  companySlug?: string | null;
  location?: string | null;
  workplaceType: string;
  employmentType: string;
  experienceLevel: string;
  companyCategory?: string | null;
  fitScore: number;
  fitReasons: string[];
  salary?: { label: string; basis: string } | null;
  descriptionText?: string | null;
  postedAt?: string | Date | null;
  hasReliableApplyLink?: boolean;
};

export function JobCard({
  job,
  userId,
}: {
  job: JobCardData;
  userId?: string | null;
}) {
  const postedLabel = job.postedAt
    ? formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })
    : null;

  return (
    <article className="inset-card stack compact-stack job-card">
      <div className="space-between">
        <div className="stack compact-stack" style={{ gap: 10 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>
              <Link href={`/jobs/${job.id}`}>{job.title}</Link>
            </h3>
            <div className="muted">
              {job.companySlug
                ? <Link href={`/companies/${job.companySlug}`}>{job.company}</Link>
                : job.company}
              {" "}•{" "}{job.location ?? "Location not listed"}
              {postedLabel ? (
                <>
                  {" "}•{" "}
                  <span title={job.postedAt ? new Date(job.postedAt).toLocaleDateString() : ""}>
                    {postedLabel}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="badges">
            {job.workplaceType !== "UNKNOWN" && (
              <span className="badge">{job.workplaceType.replaceAll("_", " ")}</span>
            )}
            {job.employmentType !== "UNKNOWN" && (
              <span className="badge">{job.employmentType.replaceAll("_", " ")}</span>
            )}
            {job.experienceLevel !== "UNKNOWN" && (
              <span className="badge">{job.experienceLevel.replaceAll("_", " ")}</span>
            )}
            {job.companyCategory ? (
              <span className="badge badge-accent">{job.companyCategory}</span>
            ) : null}
          </div>
        </div>
        <MatchReasons score={job.fitScore} reasons={job.fitReasons} userId={userId} />
      </div>

      {job.salary && (
        <div style={{ fontSize: 13, color: "#a1a1aa" }}>
          Est. <strong style={{ color: "#d4d4d8" }}>{job.salary.label}</strong>
          <span style={{ marginLeft: 6, color: "#6b7280" }}>· {job.salary.basis}</span>
        </div>
      )}

      <p className="muted" style={{ margin: 0 }}>
        {(job.descriptionText ?? "No description was provided by the source. Open the job page or apply link for the latest details.").slice(0, 220)}
        {(job.descriptionText ?? "").length > 220 ? "…" : ""}
      </p>

      <div className="actions">
        <Link className="button" href={`/jobs/${job.id}`}>Open job</Link>
        <Link
          className="button secondary"
          href={userId ? `/cover-letters/${job.id}` : `/login?next=/cover-letters/${job.id}`}
        >
          Cover letter
        </Link>
        <Link
          className="button secondary"
          href={userId ? `/resume-feedback/${job.id}` : `/login?next=/resume-feedback/${job.id}`}
        >
          Resume tips
        </Link>
        <Link
          className="button secondary"
          href={userId ? `/resume-rewrite/${job.id}` : `/login?next=/resume-rewrite/${job.id}`}
        >
          Rewrite resume
        </Link>
      </div>
    </article>
  );
}
