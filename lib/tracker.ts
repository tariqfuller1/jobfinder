import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

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

  const existing = await prisma.application.findFirst({
    where: {
      userId,
      jobId: job.id,
    },
  });

  if (existing) {
    return prisma.application.update({
      where: { id: existing.id },
      data: {
        dateApplied: existing.dateApplied ?? new Date(),
        status: ApplicationStatus.APPLIED,
        updatedAt: new Date(),
      },
    });
  }

  return prisma.application.create({
    data: {
      userId,
      jobId: job.id,
      company: job.company,
      roleTitle: job.title,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      dateApplied: new Date(),
      status: ApplicationStatus.APPLIED,
    },
  });
}

export async function updateApplication(userId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new Error("Application not found for this account.");
  }

  return prisma.application.update({
    where: { id },
    data,
  });
}
