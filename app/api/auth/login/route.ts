import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Enter your password."),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign in right now." },
      { status: 400 },
    );
  }
}
