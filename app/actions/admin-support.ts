"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ADMIN_EMAIL } from "@/lib/admin";

async function verifyAdmin() {
  const user = await getCurrentUser();
  if (!user || user.email !== ADMIN_EMAIL) notFound();
}

export async function markSupportMessageRead(id: string, read: boolean) {
  await verifyAdmin();
  await prisma.supportMessage.update({ where: { id }, data: { read } });
  revalidatePath("/admin");
}

export async function deleteSupportMessage(id: string) {
  await verifyAdmin();
  await prisma.supportMessage.delete({ where: { id } });
  revalidatePath("/admin");
}
