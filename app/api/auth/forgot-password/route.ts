import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  let email: string;
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — never reveal whether the email exists
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Expire any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashValue(token), expiresAt },
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[forgot-password] Failed to send email:", message);
    return NextResponse.json(
      { error: `Email delivery failed: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
