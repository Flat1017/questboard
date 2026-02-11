import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { requireApprovedMember } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface ArchiveRow {
  id: string;
  title: string;
  difficulty: number;
  completed_at: string;
  archived_at: string;
}

export default async function ArchivePage() {
  await requireApprovedMember();
  const supabase = await createSupabaseServerClient();

  await supabase.rpc("archive_expired_done_quests");

  const { data } = await supabase
    .from("quests")
    .select("id, title, difficulty, completed_at, archived_at")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .returns<ArchiveRow[]>();

  return (
    <main className="main-panel">
      <div className="panel-heading">
        <h2 className="panel-title">アーカイブ</h2>
        <p className="panel-subtitle">完了して保管された依頼を振り返れます。</p>
      </div>
      <div className="stack-list">
        {(data ?? []).map((item) => (
          <div key={item.id} className="archive-card">
            <div>
              <strong>{item.title}</strong>
            </div>
            <div className="inline-note">難易度: {"★".repeat(item.difficulty)}</div>
            <div className="inline-note">
              達成日: {format(new Date(item.completed_at), "yyyy/MM/dd HH:mm", { locale: ja })}
            </div>
            <div className="inline-note">
              保管日: {format(new Date(item.archived_at), "yyyy/MM/dd HH:mm", { locale: ja })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
