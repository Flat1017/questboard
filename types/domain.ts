export type QuestStatus = "OPEN" | "DOING" | "DONE";

export type MembershipStatus = "PENDING" | "APPROVED" | "REJECTED";

export type GuildRole = "ADMIN" | "MEMBER";

export type PinVariant = "IRON" | "NAIL" | "RED_PUSHPIN";

export type DeadlineFilter =
  | "ALL"
  | "TODAY"
  | "TOMORROW"
  | "THIS_WEEK"
  | "OVERDUE"
  | "NO_DEADLINE"
  | "PICKED_DATE";

export interface Quest {
  id: string;
  title: string;
  detail: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: QuestStatus;
  due_date: string | null;
  position: number;
  parchment_variant: number;
  pin_variant: PinVariant;
  pin_offset_px: number;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestWithMeta extends Quest {
  accepted_count: number;
  accepted_by_me: boolean;
  accepted_at_me: string | null;
  completed_by_name: string | null;
}

export interface UserProfile {
  id: string;
  display_name: string;
  role: GuildRole;
  membership_status: MembershipStatus;
  total_xp: number;
  created_at: string;
  updated_at: string;
}

export interface AchievementLogEntry {
  id: string;
  quest_id: string;
  quest_title: string;
  actor_id: string;
  actor_name: string;
  action: "COMPLETED";
  created_at: string;
}
