"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TabItem {
  href: string;
  label: string;
  badge?: string | number;
  /** 完全一致で判定する（概要タブなど） */
  exact?: boolean;
}

export function TabsNav({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b">
      {items.map((t) => {
        const on = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold",
              on ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground",
            )}
          >
            {t.label}
            {t.badge ? <span className="rounded-full bg-amber-50 px-1.5 text-[11px] leading-[17px] text-amber-700">{t.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
