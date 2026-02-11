import { NextResponse } from "next/server";
import { XP_BY_DIFFICULTY } from "@/lib/constants";
import { requireApiMember } from "@/lib/api-auth";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const { data: questData } = await auth.supabase
    .from("quests")
    .select("id, status, difficulty, completed_by")
    .eq("id", id)
    .single();
  const quest = questData as {
    id: string;
    status: "OPEN" | "DOING" | "DONE";
    difficulty: 1 | 2 | 3 | 4 | 5;
    completed_by: string | null;
  } | null;

  if (!quest) return NextResponse.json({ message: "クエストが見つかりません" }, { status: 404 });
  if (quest.status !== "DONE") return NextResponse.json({ message: "DONEのみ戻せます" }, { status: 400 });
  if (quest.completed_by !== auth.user.id) {
    return NextResponse.json({ message: "達成した本人のみ戻せます" }, { status: 403 });
  }

  await auth.supabase
    .from("quests")
    .update({ status: "DOING", completed_by: null, completed_at: null, archived_at: null })
    .eq("id", id)
    .eq("status", "DONE");

  const xp = XP_BY_DIFFICULTY[quest.difficulty];
  await auth.supabase.rpc("increment_user_xp", { user_id_param: auth.user.id, amount_param: -xp });

  await auth.supabase.from("quest_audit_logs").insert({
    quest_id: id,
    actor_id: auth.user.id,
    action: "REOPENED",
    meta: { xpDelta: -xp }
  });

  await auth.supabase.from("quest_achievement_logs").delete().eq("quest_id", id).eq("actor_id", auth.user.id);

  return NextResponse.json({ ok: true });
}
