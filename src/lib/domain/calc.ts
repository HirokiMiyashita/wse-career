import type { Change, Kpi, Pillar, Project, Task } from "./types";

/* ---------- 日付（"YYYY-MM-DD" 文字列で扱う） ---------- */
export function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(s: string, n: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function diffDays(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);
}
/** 今日（日本時間） */
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}
export const md = (s: string) => {
  const d = parseDate(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
export const ymd = (s: string) => {
  const d = parseDate(s);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};
export const weekday = (s: string) => "日月火水木金土"[parseDate(s).getDay()];

/* ---------- 数値 ---------- */
export const fmt = (n: number) => Math.round(n).toLocaleString("ja-JP");
export const yen = (n: number) => `${n < 0 ? "−" : ""}¥${Math.abs(Math.round(n)).toLocaleString("ja-JP")}`;
export const man = (n: number) =>
  `${n < 0 ? "−" : ""}${(Math.abs(n) / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;

/* ---------- タスク・企画 ---------- */
export const isLate = (t: Task, now: string) => t.status !== "完了" && parseDate(t.due) < parseDate(now);
export const progress = (p: Project) =>
  p.tasks.length ? Math.round((p.tasks.filter((t) => t.status === "完了").length / p.tasks.length) * 100) : 0;
export const budgetSum = (p: Project, key: "plan" | "committed" | "paid") =>
  p.budget.reduce((s, b) => s + (b[key] ?? 0), 0);
export const nextMilestone = (p: Project, now: string) =>
  [...p.milestones].sort((a, b) => a.date.localeCompare(b.date)).find((m) => m.date >= now) ?? null;

/** タスクの必要情報（業務フロー08の8項目） */
export function taskInfo(t: Task) {
  const fields: [string, string | undefined][] = [
    ["何をする", t.title],
    ["誰が実行", t.exec && t.exec !== "acct" ? t.exec : undefined],
    ["誰が承認", t.approver],
    ["着手条件", t.trigger],
    ["期限", t.due],
    ["完了条件", t.doneWhen],
    ["影響する仕事", t.affects],
    ["変更時の対応", t.onChange],
  ];
  const missing = fields.filter(([, v]) => !v).length;
  return { filled: 8 - missing, missing };
}

/* ---------- キャリア ---------- */
export const kpiProgress = (k: Kpi) => Math.max(0, Math.min(1, (k.now - k.base) / (k.target - k.base || 1)));
export const pillarProgress = (p: Pillar) =>
  p.kpis.length ? p.kpis.reduce((s, k) => s + kpiProgress(k), 0) / p.kpis.length : 0;
export const formatKpi = (v: number, unit: string) => (unit === "万円" ? `${v > 0 ? "+" : ""}${v}万円` : `${fmt(v)}${unit}`);

/* ---------- 計画の妥当性（聴く人 → ライブに来る人 → 売上・費用） ---------- */
export type FeasibilityLevel = "ok" | "mid" | "ng";
export const FEASIBILITY_LABEL: Record<FeasibilityLevel, string> = { ok: "余裕あり", mid: "実績範囲内", ng: "要見直し" };
export function feasibility(requiredPct: number): FeasibilityLevel {
  return requiredPct <= 1.0 ? "ok" : requiredPct <= 1.5 ? "mid" : "ng";
}
export function calcModel(p: Project) {
  const m = p.model;
  const total = budgetSum(p, "plan");
  const liveCost = p.budget
    .filter((b) => b.category === "ライブ" || b.category === "グッズ")
    .reduce((s, b) => s + (b.plan ?? 0), 0);
  const attendance = m.capacity ? Math.min(m.capacity, Math.round((m.listeners * m.conv) / 100)) : 0;
  const required = m.capacity && m.listeners ? (m.capacity / m.listeners) * 100 : 0;
  const ticket = attendance * m.price;
  const merch = (attendance * m.merchRate * m.merchSpend) / 100;
  const stream = m.plays * m.perPlay;
  const revenue = ticket + merch + stream;
  return {
    total,
    liveCost,
    attendance,
    required,
    revenue,
    net: revenue - total,
    liveNet: ticket + merch - liveCost,
    level: feasibility(required),
  };
}

/** 計画チェック（概要タブ） */
export function planChecks(p: Project, now: string): { level: "ok" | "wa" | "ng"; text: string }[] {
  const out: { level: "ok" | "wa" | "ng"; text: string }[] = [];
  if (p.tasks.length) {
    const late = p.tasks.filter((t) => isLate(t, now));
    out.push(
      late.length
        ? { level: "ng", text: `遅れているタスクが${late.length}件（${late.map((t) => t.title).join("、")}）` }
        : { level: "ok", text: "遅れているタスクはありません" },
    );
    const tbd = p.tasks.filter((t) => t.exec === "acct");
    if (tbd.length) out.push({ level: "wa", text: `担当者が未指定のタスクが${tbd.length}件（${tbd.map((t) => t.title).join("、")}）` });
    const announce = p.milestones.find((m) => /告知|発表/.test(m.label));
    const show = p.milestones.find((m) => /ワンマン$|パーティー/.test(m.label));
    if (announce && show) {
      const weeks = Math.round(diffDays(announce.date, show.date) / 7);
      out.push({ level: weeks >= 8 ? "ok" : "wa", text: `告知から本番まで${weeks}週間（過去の振り返りでは8〜10週が目安）` });
    }
  }
  if (p.model.capacity) {
    const c = calcModel(p);
    out.push({
      level: c.level === "ng" ? "ng" : "ok",
      text: `満員に必要なライブ転換率 ${c.required.toFixed(2)}%（社内実績 0.8〜1.5%：${FEASIBILITY_LABEL[c.level]}）`,
    });
  }
  return out;
}

/** 変更が「本人＋WSで判断」になるか（業務フロー02-④。基準値は仮） */
export function isImportantChange(p: Project, c: Pick<Change, "areas" | "cost" | "days">) {
  return (
    c.areas.some((a) => /権利|契約/.test(a)) ||
    (c.cost > 0 && (budgetSum(p, "committed") + c.cost > budgetSum(p, "plan") || c.cost >= 100000)) ||
    c.days >= 14
  );
}
