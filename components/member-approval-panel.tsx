"use client";

import { useEffect, useState } from "react";

interface PendingMember {
  id: string;
  display_name: string;
  created_at: string;
}

export function MemberApprovalPanel() {
  const [members, setMembers] = useState<PendingMember[]>([]);

  async function load() {
    const res = await fetch("/api/admin/members", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as { items: PendingMember[] };
    setMembers(payload.items);
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/admin/members/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) return;
    await load();
  }

  return (
    <section className="main-panel">
      <h3 style={{ marginTop: 0, color: "var(--ui-text)" }}>参加申請</h3>
      {members.length === 0 ? (
        <p className="inline-note">承認待ちはありません。</p>
      ) : (
        members.map((member) => (
          <div key={member.id} className="timeline-card" style={{ marginBottom: 10 }}>
            <div>
              <strong>{member.display_name}</strong>
            </div>
            <div className="quest-actions">
              <button className="btn primary" onClick={() => update(member.id, "APPROVED")}>
                承認
              </button>
              <button className="btn" onClick={() => update(member.id, "REJECTED")}>
                却下
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
