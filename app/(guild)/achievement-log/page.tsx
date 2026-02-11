import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { requireApprovedMember } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface Row {
  id: string;
  created_at: string;
  actor_id: string;
  quest: { title: string } | null;
  actor: { display_name: string } | null;
}

export default async function AchievementLogPage() {
  await requireApprovedMember();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("quest_achievement_logs")
    .select(
      "id, created_at, actor_id, quest:quests!quest_achievement_logs_quest_id_fkey(title), actor:user_profiles!quest_achievement_logs_actor_id_fkey(display_name)"
    )
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <main className="main-panel">
      <h2 style={{ marginTop: 0, color: "var(--ui-text)" }}>ギルド達成ログ</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {(data ?? []).map((entry) => (
          <div key={entry.id} className="timeline-card">
            <div>
              <strong>{entry.actor?.display_name ?? "不明な冒険者"}</strong> が
              <strong> {entry.quest?.title ?? "不明クエスト"}</strong> を達成
            </div>
            <div className="inline-note">
              {format(new Date(entry.created_at), "yyyy/MM/dd HH:mm", { locale: ja })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
