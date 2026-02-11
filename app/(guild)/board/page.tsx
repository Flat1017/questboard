import { BoardClient } from "@/components/board-client";
import { MemberApprovalPanel } from "@/components/member-approval-panel";
import { requireApprovedMember } from "@/lib/auth-guard";

export default async function BoardPage() {
  const { user, profile } = await requireApprovedMember();

  return (
    <>
      <BoardClient myUserId={user.id} role={profile.role} totalXp={profile.total_xp} />
      {profile.role === "ADMIN" ? <MemberApprovalPanel /> : null}
    </>
  );
}
