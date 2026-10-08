"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitWithRetry } from "@/lib/rate-limit";
import {
  approveAutoApply,
  cancelAutoApply,
  prepareAutoApply,
  saveSavedAnswers,
  updateAutoApplyFields,
} from "@/lib/auto-apply/service";

type Values = Record<string, string | string[]>;

export async function startAutoApply(jobId: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to use auto-apply." };

  // Each prepare fetches the form and makes several AI calls.
  const rl = rateLimitWithRetry(`auto-apply:prepare:${user.id}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return { ok: false, error: "Too many auto-apply requests. Try again in a little while." };

  try {
    return await prepareAutoApply(user.id, jobId);
  } catch (err) {
    console.error("[auto-apply] prepare failed:", err);
    return { ok: false, error: "Couldn't prepare this application. Try again." };
  }
}

export async function saveAutoApplyDraft(id: string, values: Values) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in to use auto-apply." };
  return updateAutoApplyFields(user.id, id, values);
}

export async function submitAutoApply(id: string, values: Values) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in to use auto-apply." };
  const result = await approveAutoApply(user.id, id, values);
  revalidatePath(`/auto-apply/${id}`);
  revalidatePath("/auto-apply");
  return result;
}

export async function cancelAutoApplyAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in to use auto-apply." };
  const result = await cancelAutoApply(user.id, id);
  revalidatePath("/auto-apply");
  return result;
}

export async function saveAutoApplyAnswers(answers: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in to use auto-apply." };
  const result = await saveSavedAnswers(user.id, answers);
  revalidatePath("/auto-apply");
  return result;
}
