import { NextRequest, NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api-auth";
import type { QuestStatus } from "@/types/domain";

export async function POST(req: NextRequest) {
  const auth = await requireApiMember();
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as { status?: QuestStatus; orderedIds?: string[] };
  if (!body.status || !body.orderedIds || body.orderedIds.length === 0) {
    return NextResponse.json({ message: "並び順データが不正です" }, { status: 400 });
  }

  await Promise.all(
    body.orderedIds.map((id, index) =>
      auth.supabase.from("quests").update({ position: index }).eq("id", id).eq("status", body.status as QuestStatus)
    )
  );

  return NextResponse.json({ ok: true });
}
