import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { UserProfile } from "@/types/domain";

interface ApprovedMemberContext {
  user: User;
  profile: UserProfile;
}

export async function requireApprovedMember(): Promise<ApprovedMemberContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .returns<UserProfile>()
    .single();
  const profile = profileData as UserProfile | null;

  if (!profile || profile.membership_status !== "APPROVED") {
    redirect("/auth/pending");
  }

  return { user, profile };
}
