import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { createDefaultProfileInputForUser, saveUserProfileForUser } from "@/lib/profile";

const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create account right now." },
      { status: 400 },
    );
  }
}
