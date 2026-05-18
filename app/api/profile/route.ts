import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getUserProfileByUserId, saveUserProfileForUser } from "@/lib/profile";
import { rateLimitWithRetry } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const profile = await getUserProfileByUserId(user.id);
  return NextResponse.json({ id: user.id, email: user.email, displayName: user.displayName, ...profile });
}

const shortStr = z.string().trim().max(500);
const tagStr = z.string().trim().min(1).max(100);
const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

const profileSchema = z.object({
  name: shortStr.min(1).optional(),
  email: z.string().trim().email().or(z.literal("")).optional(),
  phone: shortStr.optional(),
  location: shortStr.optional(),
  headline: shortStr.optional(),
  summary: z.string().trim().max(5000).optional(),
  preferredLocations: z.array(tagStr).max(20).optional(),
  preferredStates: z.array(tagStr).max(60).optional(),
  remotePreference: z.array(z.enum(["REMOTE", "HYBRID", "ONSITE"])).max(3).optional(),
  targetCategories: z.array(z.enum(["SOFTWARE", "GAMING", "BOTH"])).max(3).optional(),
  targetTitles: z.array(tagStr).max(30).optional(),
  skills: z.array(tagStr).max(100).optional(),
  stacks: z.array(tagStr).max(100).optional(),
  industries: z.array(tagStr).max(30).optional(),
  contactRoleTargets: z.array(tagStr).max(20).optional(),
  educationEntries: z.array(z.string().trim().max(300)).max(20).optional(),
  companiesWorked: z.array(tagStr).max(50).optional(),
  schoolKeywords: z.array(tagStr).max(30).optional(),
  connectionKeywords: z.array(tagStr).max(30).optional(),
  links: z.array(
    z.object({
      label: z.string().trim().min(1).max(100),
      url: z.string().trim().min(1).max(500).refine(isHttpUrl, "Link URL must start with http:// or https://"),
    }),
  ).max(20).optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  }

  const rl = rateLimitWithRetry(`profile:patch:${user.id}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many profile updates. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const body = profileSchema.parse(await request.json());
    const profile = await saveUserProfileForUser(user.id, {
      ...body,
      email: body.email || user.email,
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save profile settings." },
      { status: 400 },
    );
  }
}
