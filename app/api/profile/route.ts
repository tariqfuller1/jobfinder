import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { saveUserProfileForUser } from "@/lib/profile";

const profileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().or(z.literal("")).optional(),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  headline: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1).optional(),
  preferredLocations: z.array(z.string()).optional(),
  preferredStates: z.array(z.string()).optional(),
  remotePreference: z.array(z.enum(["REMOTE", "HYBRID", "ONSITE"])) .optional(),
  targetCategories: z.array(z.enum(["SOFTWARE", "GAMING", "BOTH"])) .optional(),
  targetTitles: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  stacks: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  contactRoleTargets: z.array(z.string()).optional(),
  educationEntries: z.array(z.string()).optional(),
  companiesWorked: z.array(z.string()).optional(),
  schoolKeywords: z.array(z.string()).optional(),
  connectionKeywords: z.array(z.string()).optional(),
  links: z.array(z.object({ label: z.string().trim().min(1), url: z.string().trim().min(1) })).optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
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
