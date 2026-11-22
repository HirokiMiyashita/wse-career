import Link from "next/link";
import { PHASES } from "@/lib/domain/constants";
import type { TaskStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/* ---------- アバター ---------- */
export function ArtistAvatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-14 text-xl" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", s)} style={{ backgroundColor: color }}>
      {name.slice(0, 1)}
    </span>
  );
}

/* ---------- ピル・タグ ---------- */
export type Tone = "todo" | "prog" | "wait" | "done" | "late" | "hold";
const TONE: Record<Tone, string> = {
  todo: "bg-slate-100 text-slate-600",
  prog: "bg-indigo-50 text-indigo-700",
  wait: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
  late: "bg-red-50 text-red-700",
  hold: "bg-slate-100 text-slate-400",
};
export function Pill({ tone, children, dot = true, className }: { tone: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11.5px] font-semibold", TONE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
export const statusTone = (s: TaskStatus, late = false): Tone =>
  late ? "late" : ({ 未着手: "todo", 進行中: "prog", 確認待ち: "wait", 完了: "done", 保留: "hold" } as const)[s];
export function TaskStatusPill({ status, late, due }: { status: TaskStatus; late?: boolean; due?: string }) {
  return <Pill tone={statusTone(status, late)}>{late ? `遅れ${due ? `（${due}期限）` : ""}` : status}</Pill>;
}
export function PhasePill({ phase }: { phase: number }) {
  return <Pill tone={phase >= 5 ? "done" : phase >= 3 ? "prog" : "wait"}>{PHASES[phase]}</Pill>;
}
export function Tag({ children, variant = "default", className }: { children: React.ReactNode; variant?: "default" | "primary" | "dashed" | "white"; className?: string }) {
  const v = {
    default: "bg-muted text-muted-foreground border-border",
    primary: "bg-accent text-accent-foreground border-indigo-200",
    dashed: "border-dashed bg-transparent text-muted-foreground border-slate-300",
    white: "bg-white text-slate-600 border-border",
  }[variant];
  return <span className={cn("inline-flex h-[22px] items-center whitespace-nowrap rounded-md border px-2 text-[11.5px] font-medium", v, className)}>{children}</span>;
}

/* ---------- 進捗バー ---------- */
export function Bar({ value, tone = "primary", className }: { value: number; tone?: "primary" | "ok" | "warn" | "ng"; className?: string }) {
  const c = { primary: "bg-primary", ok: "bg-emerald-600", warn: "bg-amber-500", ng: "bg-red-600" }[tone];
  return (
    <div className={cn("relative h-1.5 overflow-hidden rounded-full bg-slate-100", className)}>
      <span className={cn("absolute inset-y-0 left-0 rounded-full", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ---------- パネル ---------- */
export function Panel({
  title,
  hint,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-xs", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[15px] font-bold">
            {title}
            {hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}
          </h3>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ---------- ページ見出し ---------- */
export function PageHeader({
  title,
  sub,
  actions,
  crumb,
  icon,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  crumb?: { href?: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {crumb && (
        <div className="mb-1.5 text-[12.5px] text-muted-foreground">
          {crumb.map((c, i) => (
            <span key={i}>
              {i > 0 && " › "}
              {c.href ? (
                <Link href={c.href} className="hover:text-primary">
                  {c.label}
                </Link>
              ) : (
                c.label
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {icon}
          <div>
            <h1 className="text-2xl font-bold leading-snug tracking-tight">{title}</h1>
            {sub && <div className="mt-0.5 text-sm text-slate-500">{sub}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- 空状態・注記 ---------- */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-slate-500">
      <div className="mb-1.5 text-[15px] font-bold text-foreground">{title}</div>
      {children}
    </div>
  );
}
export function Note({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "warn" | "primary"; className?: string }) {
  const t = { default: "bg-slate-50 text-slate-600", warn: "bg-amber-50 text-amber-900", primary: "bg-accent text-indigo-800" }[tone];
  return <div className={cn("rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed", t, className)}>{children}</div>;
}
