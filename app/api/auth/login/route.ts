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
  const ip = getClientIp(request);
  // IP-level: block volume attacks from a single IP
  const { allowed: ipAllowed, retryAfterSec: ipRetry } = rateLimitWithRetry(`login:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipAllowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": String(ipRetry) } },
    );
  }

  let body: z.infer<typeof loginSchema>;
  try {
    body = loginSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 400 });
  }

  if (body._hp) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = body.email.toLowerCase();

  // Per-account: block targeted brute force across multiple IPs
  const { allowed: emailAllowed, retryAfterSec: emailRetry } = rateLimitWithRetry(`login:email:${email}`, 10, 15 * 60 * 1000);
  if (!emailAllowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": String(emailRetry) } },
    );
  }

  try {
    if (!await verifyTurnstile(body.turnstileToken, ip)) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 400 });
  }
}
