"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimitWithRetry } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  category: z.enum(["Bug report", "Feature request", "General question", "Other"]),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
});

export async function sendSupport(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();

  const headersList = await headers();
  const ip = headersList.get("cf-connecting-ip") ?? headersList.get("x-forwarded-for") ?? "unknown";
  const key = user ? `support:user:${user.id}` : `support:ip:${ip}`;
  const { allowed } = rateLimitWithRetry(key, 3, 60 * 60 * 1000);
  if (!allowed) {
    return { ok: false, error: "Too many messages sent. Please wait an hour before trying again." };
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
    category: formData.get("category"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    await prisma.supportMessage.create({ data: parsed.data });
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to send your message. Please try again later." };
  }
}
