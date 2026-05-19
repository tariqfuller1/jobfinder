"use server";

import { getCurrentUser } from "@/lib/auth";
import { parseResumeWithAI } from "@/lib/parse-resume-ai";

export async function parseResumeToStructured(resumeText: string) {
  if (!await getCurrentUser()) return { ok: false as const, error: "Sign in to use AI features." };
  return parseResumeWithAI(resumeText);
}
