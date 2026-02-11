import { NextRequest, NextResponse } from "next/server";
import { isAdmin, requireApiMember } from "@/lib/api-auth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.profile.role)) {
    return NextResponse.json({ message: "管理者のみ" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: "APPROVED" | "REJECTED" };
  if (!body.status || !["APPROVED", "REJECTED"].includes(body.status)) {
    return NextResponse.json({ message: "不正なステータス" }, { status: 400 });
  }

  await auth.supabase.from("user_profiles").update({ membership_status: body.status }).eq("id", id);

  return NextResponse.json({ ok: true });
}
