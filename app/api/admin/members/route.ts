import { NextResponse } from "next/server";
import { isAdmin, requireApiMember } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.profile.role)) {
    return NextResponse.json({ message: "管理者のみ" }, { status: 403 });
  }

  const { data } = await auth.supabase
    .from("user_profiles")
    .select("id, display_name, created_at")
    .eq("membership_status", "PENDING")
    .order("created_at", { ascending: true });

  return NextResponse.json({ items: data ?? [] });
}
