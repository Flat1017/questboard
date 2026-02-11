import { NextRequest, NextResponse } from "next/server";
import { clampDifficulty } from "@/lib/utils";
import { isAdmin, requireApiMember } from "@/lib/api-auth";
import { createQuestVisualSeed } from "@/lib/quest-random";
import { listQuestsByStatus } from "@/lib/quest-query";
import type { QuestStatus } from "@/types/domain";

export async function GET(req: NextRequest) {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;

  const status = req.nextUrl.searchParams.get("status") as QuestStatus | null;
  if (!status || !["OPEN", "DOING", "DONE"].includes(status)) {
    return NextResponse.json({ message: "不正なステータス" }, { status: 400 });
  }

  await auth.supabase.rpc("archive_expired_done_quests");

  const items = await listQuestsByStatus(auth.supabase, status, auth.user);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.profile.role)) {
    return NextResponse.json({ message: "管理者のみ作成できます" }, { status: 403 });
  }

  const body = (await req.json()) as {
    title?: string;
    difficulty?: number;
    dueDate?: string;
    detail?: string;
  };

  if (!body.title || !body.dueDate || !body.difficulty) {
    return NextResponse.json({ message: "必須項目が不足しています" }, { status: 400 });
  }

  const difficulty = clampDifficulty(body.difficulty);
  const { data: maxPosRowData } = await auth.supabase
    .from("quests")
    .select("position")
    .eq("status", "OPEN")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const maxPosRow = maxPosRowData as { position: number } | null;

  const visual = createQuestVisualSeed();
  const nextPosition = (maxPosRow?.position ?? -1) + 1;

  const { error } = await auth.supabase.from("quests").insert({
    title: body.title,
    detail: body.detail?.trim() || null,
    difficulty,
    due_date: body.dueDate,
    status: "OPEN",
    position: nextPosition,
    created_by: auth.user.id,
    ...visual
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
