import { NextResponse } from "next/server";
import { XP_BY_DIFFICULTY } from "@/lib/constants";
import { requireApiMember } from "@/lib/api-auth";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const { data: questData } = await auth.supabase
    .from("quests")
    .select("id, status, difficulty")
    .eq("id", id)
    .single();
  const quest = questData as { id: string; status: "OPEN" | "DOING" | "DONE"; difficulty: 1 | 2 | 3 | 4 | 5 } | null;

  if (!quest) return NextResponse.json({ message: "クエストが見つかりません" }, { status: 404 });
  if (quest.status !== "DOING") return NextResponse.json({ message: "DOINGのみ達成できます" }, { status: 400 });

  const { data: acceptance } = await auth.supabase
    .from("quest_acceptances")
    .select("quest_id")
    .eq("quest_id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!acceptance) {
    return NextResponse.json({ message: "受注者のみ達成できます" }, { status: 403 });
  }

  const completedAt = new Date().toISOString();
  await auth.supabase
    .from("quests")
    .update({ status: "DONE", completed_by: auth.user.id, completed_at: completedAt })
    .eq("id", id)
    .eq("status", "DOING");

  const xp = XP_BY_DIFFICULTY[quest.difficulty];
  await auth.supabase.rpc("increment_user_xp", { user_id_param: auth.user.id, amount_param: xp });

  await auth.supabase.from("quest_audit_logs").insert({
    quest_id: id,
    actor_id: auth.user.id,
    action: "COMPLETED",
    meta: { xp }
  });

  await auth.supabase.from("quest_achievement_logs").insert({
    quest_id: id,
    actor_id: auth.user.id
  });

  return NextResponse.json({ ok: true });
}
