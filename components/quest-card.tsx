"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ReadMore } from "@/components/read-more";
import { ParchmentShape } from "@/components/parchment-shape";
import { XP_BY_DIFFICULTY } from "@/lib/constants";
import { deadlineLabel } from "@/lib/utils";
import type { QuestWithMeta, QuestStatus } from "@/types/domain";

interface Props {
  quest: QuestWithMeta;
  myUserId: string;
  currentStatus: QuestStatus;
  dragging?: boolean;
  onAccept: (questId: string) => Promise<void>;
  onUnaccept: (questId: string) => Promise<void>;
  onComplete: (questId: string) => Promise<void>;
  onReopen: (questId: string) => Promise<void>;
}

export function QuestCard({
  quest,
  myUserId,
  currentStatus,
  dragging = false,
  onAccept,
  onUnaccept,
  onComplete,
  onReopen
}: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [isStamping, setIsStamping] = useState(false);

  const acceptedDate = useMemo(() => {
    if (!quest.accepted_at_me) return "-";
    return format(new Date(quest.accepted_at_me), "yyyy/MM/dd", { locale: ja });
  }, [quest.accepted_at_me]);

  const canAccept = quest.status !== "DONE" && !quest.accepted_by_me;
  const canUnaccept = quest.status !== "DONE" && quest.accepted_by_me;
  const canComplete = quest.status === "DOING" && quest.accepted_by_me;
  const canReopen = quest.status === "DONE" && quest.completed_by === myUserId;

  async function run(action: () => Promise<void>, withStamp = false) {
    if (isBusy) return;
    setIsBusy(true);

    if (withStamp) {
      setIsStamping(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    try {
      await action();
    } finally {
      setIsBusy(false);
      setIsStamping(false);
    }
  }

  return (
    <article className={clsx("quest-card", { dragging, stamping: isStamping })}>
      <ParchmentShape variant={quest.parchment_variant} />
      <div
        className={`pin pin-${quest.pin_variant}`}
        style={{ transform: `translateX(calc(-50% + ${quest.pin_offset_px}px))` }}
      />

      <div className="quest-content">
        <h3 className="quest-title">{quest.title}</h3>

        <div className="quest-meta">難易度: {"★".repeat(quest.difficulty)}</div>
        {currentStatus !== "OPEN" && <div className="quest-meta">受注日: {acceptedDate}</div>}
        <div className="quest-meta">期限: {deadlineLabel(quest.due_date)}</div>
        <div className="quest-meta">受注者数: {quest.accepted_count} 名</div>
        {quest.detail ? <ReadMore text={quest.detail} /> : null}
        {quest.status === "DONE" && quest.completed_at ? (
          <div className="quest-meta">達成日: {format(new Date(quest.completed_at), "yyyy/MM/dd HH:mm", { locale: ja })}</div>
        ) : null}

        <div className="quest-actions">
          {canAccept ? (
            <button className="btn primary" disabled={isBusy} onClick={() => run(() => onAccept(quest.id))}>
              受注する
            </button>
          ) : null}
          {canUnaccept ? (
            <button className="btn" disabled={isBusy} onClick={() => run(() => onUnaccept(quest.id))}>
              受注解除
            </button>
          ) : null}
          {canComplete ? (
            <button className="btn alert" disabled={isBusy} onClick={() => run(() => onComplete(quest.id), true)}>
              達成する (+{XP_BY_DIFFICULTY[quest.difficulty]} XP)
            </button>
          ) : null}
          {canReopen ? (
            <button className="btn" disabled={isBusy} onClick={() => run(() => onReopen(quest.id))}>
              DOINGに戻す (-{XP_BY_DIFFICULTY[quest.difficulty]} XP)
            </button>
          ) : null}
        </div>
      </div>

      {(isStamping || quest.status === "DONE") && (
        <div className="quest-completed-stamp">
          <div className={clsx("stamp-text", { "stamp-anim-enter": isStamping })}>COMPLETED</div>
        </div>
      )}
    </article>
  );
}
