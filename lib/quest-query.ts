import type { QuestWithMeta, QuestStatus } from "@/types/domain";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface QuestRow {
  id: string;
  title: string;
  detail: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: QuestStatus;
  due_date: string | null;
  position: number;
  parchment_variant: number;
  pin_variant: "IRON" | "NAIL" | "RED_PUSHPIN";
  pin_offset_px: number;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listQuestsByStatus(
  supabase: SupabaseClient,
  status: QuestStatus,
  user: User
): Promise<QuestWithMeta[]> {
  const { data: quests } = await supabase
    .from("quests")
    .select("*")
    .eq("status", status)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .returns<QuestRow[]>();

  if (!quests || quests.length === 0) return [];

  const questIds = quests.map((q) => q.id);
  const { data: accepts } = await supabase
    .from("quest_acceptances")
    .select("quest_id, user_id, accepted_at")
    .in("quest_id", questIds);

  const acceptedByQuest = new Map<string, { count: number; meAt: string | null }>();

  for (const questId of questIds) {
    acceptedByQuest.set(questId, { count: 0, meAt: null });
  }

  for (const row of accepts ?? []) {
    const bag = acceptedByQuest.get(row.quest_id);
    if (!bag) continue;
    bag.count += 1;
    if (row.user_id === user.id) {
      bag.meAt = row.accepted_at;
    }
  }

  const completedByIds = Array.from(new Set(quests.map((q) => q.completed_by).filter(Boolean))) as string[];
  const nameMap = new Map<string, string>();
  if (completedByIds.length > 0) {
    const { data: users } = await supabase
      .from("user_profiles")
      .select("id, display_name")
      .in("id", completedByIds);
    for (const row of users ?? []) {
      nameMap.set(row.id, row.display_name);
    }
  }

  return quests.map((quest) => {
    const stat = acceptedByQuest.get(quest.id) ?? { count: 0, meAt: null };
    return {
      ...quest,
      accepted_count: stat.count,
      accepted_by_me: Boolean(stat.meAt),
      accepted_at_me: stat.meAt,
      completed_by_name: quest.completed_by ? (nameMap.get(quest.completed_by) ?? null) : null
    };
  });
}
