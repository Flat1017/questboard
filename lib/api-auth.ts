import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { UserProfile } from "@/types/domain";

type ApiMemberFailure = { error: NextResponse };
type ApiMemberSuccess = { supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; user: User; profile: UserProfile };

export async function requireApiMember(): Promise<ApiMemberFailure | ApiMemberSuccess> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ message: "未認証です" }, { status: 401 }) };
  }

  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .returns<UserProfile>()
    .single();
  const profile = profileData as UserProfile | null;

  if (!profile || profile.membership_status !== "APPROVED") {
    return { error: NextResponse.json({ message: "ギルド承認待ちです" }, { status: 403 }) };
  }

  return { supabase, user, profile };
}

export function isAdmin(role: string): role is "ADMIN" {
  return role === "ADMIN";
}
