import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createManualApplication(
  userId: string,
  data: { company: string; roleTitle: string; applyUrl: string; status: string },
) {
  const externalId = `manual-${userId}-${Date.now()}`;
  const url = data.applyUrl.trim() || "https://example.com";

  const job = await prisma.job.create({
    data: {
      source: "manual",
      externalId,
      sourceUrl: url,
      applyUrl: url,
      title: data.roleTitle,
      company: data.company,
    },
  });

  const status = Object.values(ApplicationStatus).includes(data.status as ApplicationStatus)
    ? (data.status as ApplicationStatus)
    : ApplicationStatus.SAVED;

  return prisma.application.create({
    data: {
      userId,
      jobId: job.id,
      company: data.company,
      roleTitle: data.roleTitle,
      sourceUrl: url,
      applyUrl: url,
      status,
      dateApplied: status === ApplicationStatus.APPLIED ? new Date() : null,
    },
  });
}

/** Returns a map of jobId → ApplicationStatus for all jobs the user has tracked. */
export async function getTrackedJobStatuses(userId: string): Promise<Map<string, string>> {
  const rows = await prisma.application.findMany({
    where: { userId },
    select: { jobId: true, status: true },
  });
  return new Map(rows.filter((r) => r.jobId).map((r) => [r.jobId!, r.status as string]));
}

export async function listApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    include: { job: true },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function createApplication(userId: string, jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  const existing = await prisma.application.findFirst({ where: { userId, jobId: job.id } });
  if (existing) {
    if (existing.status === ApplicationStatus.SAVED || existing.status === ApplicationStatus.REACHING_OUT) {
      return prisma.application.update({
        where: { id: existing.id },
        data: { status: ApplicationStatus.APPLIED, dateApplied: new Date() },
      });
    }
    return existing;
  }

  try {
    return await prisma.application.create({
      data: {
        userId,
        jobId: job.id,
        company: job.company,
        roleTitle: job.title,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl,
        status: ApplicationStatus.APPLIED,
        dateApplied: new Date(),
      },
    });
  } catch {
    // Concurrent request already created the row — return it
    const created = await prisma.application.findFirst({ where: { userId, jobId: job.id } });
    if (created) return created;
    throw new Error("Failed to save application.");
  }
}

export async function deleteApplication(userId: string, id: string) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Not found.");
  return prisma.application.delete({ where: { id } });
}

export async function updateApplication(userId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Application not found for this account.");
  return prisma.application.update({ where: { id }, data });
}
