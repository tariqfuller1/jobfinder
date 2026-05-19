"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { WorkExperienceEntry, ProjectEntry } from "@/lib/profile";
import { revalidatePath } from "next/cache";

function clampStr(s: unknown, max: number): string {
  return typeof s === "string" ? s.slice(0, max) : "";
}

function clampWorkEntries(entries: WorkExperienceEntry[]): WorkExperienceEntry[] {
  return entries.slice(0, 20).map((e) => ({
    id: clampStr(e.id, 64),
    company: clampStr(e.company, 200),
    title: clampStr(e.title, 200),
    location: e.location ? clampStr(e.location, 200) : undefined,
    startDate: clampStr(e.startDate, 50),
    endDate: clampStr(e.endDate, 50),
    bullets: Array.isArray(e.bullets)
      ? e.bullets.slice(0, 10).map((b) => clampStr(b, 1000))
      : [],
  }));
}

function clampProjectEntries(entries: ProjectEntry[]): ProjectEntry[] {
  return entries.slice(0, 20).map((p) => ({
    id: clampStr(p.id, 64),
    name: clampStr(p.name, 200),
    url: p.url ? clampStr(p.url, 500) : undefined,
    technologies: Array.isArray(p.technologies)
      ? p.technologies.slice(0, 20).map((t) => clampStr(t, 100))
      : [],
    bullets: Array.isArray(p.bullets)
      ? p.bullets.slice(0, 10).map((b) => clampStr(b, 1000))
      : [],
  }));
}

export async function saveWorkExperience(entries: WorkExperienceEntry[]) {
  const user = await requireCurrentUser();
  const safe = clampWorkEntries(Array.isArray(entries) ? entries : []);
  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: { workExperience: JSON.stringify(safe) },
    create: {
      userId: user.id,
      workExperience: JSON.stringify(safe),
      projects: "[]",
    },
  });
  revalidatePath("/profile");
}

export async function saveProjects(entries: ProjectEntry[]) {
  const user = await requireCurrentUser();
  const safe = clampProjectEntries(Array.isArray(entries) ? entries : []);
  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: { projects: JSON.stringify(safe) },
    create: {
      userId: user.id,
      projects: JSON.stringify(safe),
      workExperience: "[]",
    },
  });
  revalidatePath("/profile");
}
