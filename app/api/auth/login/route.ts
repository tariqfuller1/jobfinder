import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { rateLimitWithRetry, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Enter your password.").max(1024, "Password too long."),
  turnstileToken: z.string().optional(),
  _hp: z.string().optional(),
});

export async function POST(request: Request) {
  // 10 attempts per 15 minutes per IP
  const ip = getClientIp(request);
  const { allowed: loginAllowed, retryAfterSec } = rateLimitWithRetry(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!loginAllowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  try {
    const body = loginSchema.parse(await request.json());

    // Honeypot — real browsers leave this empty
    if (body._hp) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (!await verifyTurnstile(body.turnstileToken, ip)) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    }

    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 400 });
  }
}
