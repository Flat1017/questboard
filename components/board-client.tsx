"use client";

import { isSameDay, parseISO } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestCard } from "@/components/quest-card";
import { QuestForm } from "@/components/quest-form";
import { isInThisWeek } from "@/lib/utils";
import type { DeadlineFilter, QuestStatus, QuestWithMeta } from "@/types/domain";

const TABS: { label: string; value: QuestStatus }[] = [
  { label: "OPEN", value: "OPEN" },
  { label: "DOING", value: "DOING" },
  { label: "DONE", value: "DONE" }
];

interface Props {
  myUserId: string;
  role: "ADMIN" | "MEMBER";
  totalXp: number;
}

interface QuestResponse {
  items: QuestWithMeta[];
}

export function BoardClient({ myUserId, role, totalXp }: Props) {
  const [activeTab, setActiveTab] = useState<QuestStatus>("OPEN");
  const [filter, setFilter] = useState<DeadlineFilter>("ALL");
  const [pickedDate, setPickedDate] = useState("");
  const [questsByStatus, setQuestsByStatus] = useState<Record<QuestStatus, QuestWithMeta[]>>({
    OPEN: [],
    DOING: [],
    DONE: []
  });
  const [dragId, setDragId] = useState<string | null>(null);

  const loadStatus = useCallback(async (status: QuestStatus) => {
    const res = await fetch(`/api/quests?status=${status}`, { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as QuestResponse;
    setQuestsByStatus((prev) => ({ ...prev, [status]: payload.items }));
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadStatus("OPEN"), loadStatus("DOING"), loadStatus("DONE")]);
  }, [loadStatus]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const visible = useMemo(() => {
    const list = questsByStatus[activeTab];
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    return list.filter((quest) => {
      switch (filter) {
        case "ALL":
          return true;
        case "TODAY":
          return quest.due_date ? isSameDay(parseISO(quest.due_date), now) : false;
        case "TOMORROW":
          return quest.due_date ? isSameDay(parseISO(quest.due_date), tomorrow) : false;
        case "THIS_WEEK":
          return quest.due_date ? isInThisWeek(quest.due_date, now) : false;
        case "OVERDUE":
          return quest.due_date ? parseISO(quest.due_date) < now && !isSameDay(parseISO(quest.due_date), now) : false;
        case "NO_DEADLINE":
          return !quest.due_date;
        case "PICKED_DATE":
          return quest.due_date && pickedDate ? isSameDay(parseISO(quest.due_date), parseISO(pickedDate)) : false;
      }
    });
  }, [activeTab, filter, pickedDate, questsByStatus]);

  async function post(path: string, questId: string) {
    const res = await fetch(path.replace(":id", questId), { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "操作に失敗しました" }));
      throw new Error(err.message ?? "操作に失敗しました");
    }
    await loadAll();
  }

  function reorderWithinList(sourceId: string, destinationId: string) {
    setQuestsByStatus((prev) => {
      const current = [...prev[activeTab]];
      const from = current.findIndex((q) => q.id === sourceId);
      const to = current.findIndex((q) => q.id === destinationId);
      if (from < 0 || to < 0 || from === to) return prev;
      const [picked] = current.splice(from, 1);
      current.splice(to, 0, picked);

      void fetch("/api/quests/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: activeTab, orderedIds: current.map((q) => q.id) })
      });

      return { ...prev, [activeTab]: current };
    });
  }

  return (
    <>
      <div className="kpi">
        <span className="kpi-label">酒場での評判</span>
        <strong className="kpi-value">{totalXp} XP</strong>
        <span className="inline-note">達成報告で評判はさらに上がります</span>
      </div>

      {role === "ADMIN" ? <QuestForm onCreated={loadAll} /> : null}

      <div className="main-panel">
        <div className="panel-heading">
          <h2 className="panel-title">本日の依頼板</h2>
          <p className="panel-subtitle">炉端の灯りの下で、仲間の頼みごとを選びましょう。</p>
        </div>

        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`tab-btn ${tab.value === activeTab ? "active" : ""}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-row">
          {[
            ["ALL", "すべて"],
            ["TODAY", "今日"],
            ["TOMORROW", "明日"],
            ["THIS_WEEK", "今週"],
            ["OVERDUE", "期限超過"],
            ["NO_DEADLINE", "期限なし"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key as DeadlineFilter)}
            >
              {label}
            </button>
          ))}

          <input
            className="date-input"
            type="date"
            value={pickedDate}
            onChange={(e) => {
              setPickedDate(e.target.value);
              setFilter("PICKED_DATE");
            }}
          />
        </div>

        <div className="quests-grid">
          {visible.map((quest) => (
            <div
              key={quest.id}
              className="quest-drag-wrapper"
              draggable
              onDragStart={() => setDragId(quest.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== quest.id) reorderWithinList(dragId, quest.id);
                setDragId(null);
              }}
            >
              <QuestCard
                quest={quest}
                myUserId={myUserId}
                currentStatus={activeTab}
                dragging={dragId === quest.id}
                onAccept={(id) => post("/api/quests/:id/accept", id)}
                onUnaccept={(id) => post("/api/quests/:id/unaccept", id)}
                onComplete={(id) => post("/api/quests/:id/complete", id)}
                onReopen={(id) => post("/api/quests/:id/reopen", id)}
              />
            </div>
          ))}
        </div>

        {visible.length === 0 ? <p className="inline-note">該当するクエストがありません。</p> : null}
      </div>
    </>
  );
}
