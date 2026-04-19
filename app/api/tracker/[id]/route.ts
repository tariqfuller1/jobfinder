import { NextResponse } from "next/server";
import { z } from "zod";
import { updateApplication } from "@/lib/tracker";
import { getCurrentUserFromRequest } from "@/lib/auth";

const updateSchema = z.object({
  status: z.enum(["SAVED", "APPLIED", "REACHING_OUT", "RECRUITER_REACHED_OUT", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED"]).optional(),
  userReachedOut: z.boolean().optional(),
  companyReachedOut: z.boolean().optional(),
  followUpDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to update your tracker." }, { status: 401 });
  }

  const { id } = await params;
  const body = updateSchema.parse(await request.json());

  try {
    const updated = await updateApplication(user.id, id, {
      ...body,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : body.followUpDate,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the application." },
      { status: 404 },
    );
  }
}
