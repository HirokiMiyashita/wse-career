"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArtistAvatar } from "./ui";

const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  check: "M9 12l2 2 4-4M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z",
  grid: "M3 5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM14 5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2zM3 16a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM14 16a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z",
  book: "M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM8 20a2 2 0 0 1 0-4h10",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
};
export function Icon({ name, className }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cn("size-[18px] shrink-0", className)}>
      <path d={ICONS[name]} />
    </svg>
  );
}

export interface NavArtist {
  id: string;
  name: string;
  color: string;
  label: string;
}

export function Sidebar({ artists, pending, email, isAdmin }: { artists: NavArtist[]; pending: number; email: string | null; isAdmin: boolean }) {
  const pathname = usePathname();
  const item = (href: string, on: boolean, children: React.ReactNode) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "mb-0.5 flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium",
        on ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
  return (
    <aside className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b bg-sidebar px-2.5 py-1.5 md:h-svh md:w-60 md:flex-col md:items-stretch md:border-b-0 md:border-r md:px-3 md:py-4">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-1 md:px-2.5 md:pb-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">WS</span>
        <span className="hidden md:block">
          <b className="block text-sm leading-tight">WSE Career</b>
          <span className="text-[11px] text-muted-foreground">キャリア＆プロジェクト</span>
        </span>
      </Link>
      <nav className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto md:block md:overflow-y-auto">
        {item("/dashboard", pathname === "/dashboard", <><Icon name="home" />ホーム</>)}
        {item(
          "/dashboard/approvals",
          pathname.startsWith("/dashboard/approvals"),
          <>
            <Icon name="check" />
            判断待ち
            {pending > 0 && <em className="ml-auto rounded-full bg-red-600 px-1.5 text-[11px] font-bold not-italic leading-[18px] text-white">{pending}</em>}
          </>,
        )}
        {item("/dashboard/projects", pathname.startsWith("/dashboard/projects"), <><Icon name="grid" />企画一覧</>)}
        <div className="hidden px-2.5 pb-1.5 pt-4 text-[11px] font-semibold text-muted-foreground md:block">アーティスト</div>
        {artists.map((a) =>
          item(
            `/dashboard/artists/${a.id}`,
            pathname.startsWith(`/dashboard/artists/${a.id}`),
            <>
              <ArtistAvatar name={a.name} color={a.color} size="sm" />
              {a.name}
              <small className="ml-auto text-[11px] text-muted-foreground">{a.label}</small>
            </>,
          ),
        )}
        {item(
          "/dashboard/artists/new",
          pathname === "/dashboard/artists/new",
          <span className="flex items-center gap-2.5 text-primary">
            <span className="w-6 text-center font-bold">＋</span>アーティストを追加
          </span>,
        )}
        <div className="hidden px-2.5 pb-1.5 pt-4 text-[11px] font-semibold text-muted-foreground md:block">学び</div>
        {item("/dashboard/knowledge", pathname.startsWith("/dashboard/knowledge"), <><Icon name="book" />ナレッジ</>)}
        <div className="hidden px-2.5 pb-1.5 pt-4 text-[11px] font-semibold text-muted-foreground md:block">設定</div>
        {item(
          "/dashboard/members",
          pathname.startsWith("/dashboard/members"),
          <>
            <Icon name="users" />
            メンバー
            {isAdmin && <small className="ml-auto text-[11px] text-muted-foreground">招待</small>}
          </>,
        )}
      </nav>
      {email && <div className="hidden truncate border-t px-2.5 pt-3 text-xs text-muted-foreground md:block">{email}</div>}
    </aside>
  );
}
