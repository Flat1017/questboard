"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { ThemeToggle } from "@/components/theme-toggle";

const NAVS = [
  { href: "/board", label: "クエストボード" },
  { href: "/achievement-log", label: "達成ログ" },
  { href: "/archive", label: "アーカイブ" }
] as const;

export function GuildHeader({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <header className="guild-header">
      <span className="header-lantern left" aria-hidden />
      <span className="header-lantern right" aria-hidden />

      <div className="guild-brand">
        <p className="tavern-signline">The Black Cask Tavern</p>
        <div className="guild-title">冒険者ギルド掲示板</div>
        <div className="inline-note tavern-welcome">ようこそ、{displayName} さん</div>
      </div>
      <nav className="guild-nav">
        {NAVS.map((nav) => (
          <Link
            key={nav.href}
            href={nav.href}
            aria-current={pathname === nav.href ? "page" : undefined}
            className={`nav-link ${pathname === nav.href ? "active" : ""}`}
          >
            {nav.label}
          </Link>
        ))}
        <ThemeToggle />
        <button className="btn" type="button" onClick={signOut}>
          ログアウト
        </button>
      </nav>
    </header>
  );
}
