import Link from "next/link";

export default function PendingPage() {
  return (
    <main className="guild-shell auth-shell pending-shell">
      <section className="auth-card">
        <h1 className="card-title">承認待ち</h1>
        <p>ギルド参加申請は管理者の承認待ちです。</p>
        <p className="inline-note">承認または却下が行われるまで、クエストボードは利用できません。</p>
        <Link href="/auth" className="btn pending-link">
          ログイン画面へ戻る
        </Link>
      </section>
    </main>
  );
}
