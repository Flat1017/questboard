"use client";

import { useState } from "react";

interface Props {
  onCreated: () => Promise<void>;
}

export function QuestForm({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [dueDate, setDueDate] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, difficulty, dueDate, detail })
      });
      if (!res.ok) throw new Error("作成に失敗しました");
      setTitle("");
      setDifficulty(3);
      setDueDate("");
      setDetail("");
      await onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h3 className="card-title">新しい依頼を掲示する</h3>
      <p className="inline-note section-copy">今夜の酒場掲示板に、冒険者向けの依頼を追加します。</p>
      <div className="field">
        <label htmlFor="title">タイトル (必須)</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="difficulty">ディフィカリティ (必須)</label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          required
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <option key={v} value={v}>
              {"★".repeat(v)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="dueDate">デッドライン (必須)</label>
        <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="detail">ディティール (任意)</label>
        <textarea id="detail" rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={3000} />
      </div>
      <button className="btn primary" disabled={saving}>
        {saving ? "作成中..." : "クエストを掲示"}
      </button>
    </form>
  );
}
