import { GuildHeader } from "@/components/guild-header";
import { requireApprovedMember } from "@/lib/auth-guard";

export default async function GuildLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireApprovedMember();

  return (
    <div className="guild-shell">
      <GuildHeader displayName={profile.display_name} />
      {children}
    </div>
  );
}
