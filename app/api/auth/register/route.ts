import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { createDefaultProfileInputForUser, saveUserProfileForUser } from "@/lib/profile";
import { rateLimitWithRetry, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(200, "Name must be 200 characters or fewer."),
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(1024, "Password too long."),
  turnstileToken: z.string().optional(),
  _hp: z.string().optional(),
});

export async function POST(request: Request) {
  // 5 registrations per hour per IP
  const ip = getClientIp(request);
  const { allowed: registerAllowed, retryAfterSec } = rateLimitWithRetry(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!registerAllowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  try {
    const body = registerSchema.parse(await request.json());

    // Honeypot — real browsers leave this empty
    if (body._hp) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (!await verifyTurnstile(body.turnstileToken, ip)) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    }

    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        displayName: body.displayName.trim(),
        passwordHash: hashPassword(body.password),
      },
    });

    await saveUserProfileForUser(user.id, createDefaultProfileInputForUser({
      name: user.displayName ?? undefined,
      email: user.email,
    }));

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 400 });
  }
}
