import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimitWithRetry, getClientIp } from "@/lib/rate-limit";

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 5 reset emails per hour per IP
  const { allowed, retryAfterSec } = rateLimitWithRetry(`forgot-password:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  let email: string;
  let turnstileToken: string | undefined;
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  if (!await verifyTurnstile(turnstileToken, ip)) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  // Pad to a constant minimum time so response duration doesn't reveal whether the email exists
  const requestStart = Date.now();

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashValue(token), expiresAt },
    });
    sendPasswordResetEmail(email, token).catch((err) => {
      console.error("[forgot-password] Failed to send email:", err instanceof Error ? err.message : err);
    });
  }

  const elapsed = Date.now() - requestStart;
  if (elapsed < 500) {
    await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
  }

  return NextResponse.json({ ok: true });
}
