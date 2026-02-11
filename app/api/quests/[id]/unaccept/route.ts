import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api-auth";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const { data: questData } = await auth.supabase
    .from("quests")
    .select("id, status")
    .eq("id", id)
    .single();
  const quest = questData as { id: string; status: "OPEN" | "DOING" | "DONE" } | null;

  if (!quest) return NextResponse.json({ message: "クエストが見つかりません" }, { status: 404 });
  if (quest.status === "DONE") return NextResponse.json({ message: "DONEは受注解除できません" }, { status: 400 });

  await auth.supabase.from("quest_acceptances").delete().eq("quest_id", id).eq("user_id", auth.user.id);

  const { count } = await auth.supabase
    .from("quest_acceptances")
    .select("*", { count: "exact", head: true })
    .eq("quest_id", id);

  if ((count ?? 0) === 0) {
    await auth.supabase.from("quests").update({ status: "OPEN" }).eq("id", id);
  }

  await auth.supabase.from("quest_audit_logs").insert({
    quest_id: id,
    actor_id: auth.user.id,
    action: "UNACCEPTED"
  });

  return NextResponse.json({ ok: true });
}
