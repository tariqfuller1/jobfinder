"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";
import { revalidatePath } from "next/cache";

export async function saveWorkExperience(entries: WorkExperienceEntry[]) {
  const user = await requireCurrentUser();
  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: { workExperience: JSON.stringify(entries) },
    create: {
      userId: user.id,
      workExperience: JSON.stringify(entries),
      projects: "[]",
    },
  });
  revalidatePath("/profile");
}

export async function saveProjects(entries: ProjectEntry[]) {
  const user = await requireCurrentUser();
  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: { projects: JSON.stringify(entries) },
    create: {
      userId: user.id,
      projects: JSON.stringify(entries),
      workExperience: "[]",
    },
  });
  revalidatePath("/profile");
}
