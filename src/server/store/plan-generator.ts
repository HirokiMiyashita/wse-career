import { addDays, diffDays } from "@/lib/domain/calc";
import type { BudgetLine, Milestone, Task } from "@/lib/domain/types";

/**
 * 進め方の案と、採用した案を「日程・担当・予算・タスク」に展開するテンプレート。
 * AI（LLM）は案のパラメータを出し、タスクと予算はこの標準テンプレートの相対日程から作る想定。
 * デモでは NOA（仮）の「2nd EP → ワンマン」の3案を固定で用意している。
 */
export interface PlanOption {
  key: "A" | "B" | "C";
  title: string;
  singles: string[];
  release: string;
  announce: string;
  show: string;
  capacity: number;
  listenersTarget: number;
  showName: string;
  mvCount: number;
  risk: string;
}

export const NOA_OPTIONS: PlanOption[] = [
  { key: "A", title: "先行2曲 → EP → 7週後にワンマン", singles: ["2027-01-15", "2027-02-19"], release: "2027-03-26", announce: "2027-03-26", show: "2027-05-15", capacity: 250, listenersTarget: 20000, showName: "東京ワンマン（キャパ250）", mvCount: 1, risk: "告知から本番まで7週。過去の振り返り（8〜10週推奨）より短い。必要転換率1.25%は本人実績0.8%を大きく上回る。" },
  { key: "B", title: "先行3曲（4週間隔）→ EP発売日にワンマン発表 → 9週後", singles: ["2027-01-15", "2027-02-12", "2027-03-12"], release: "2027-04-09", announce: "2027-04-09", show: "2027-06-12", capacity: 250, listenersTarget: 24000, showName: "東京ワンマン（キャパ250）", mvCount: 2, risk: "期間が長く、MV2本で費用が増える。リスナー24,000人に届けば転換率1.04%で実績範囲内。" },
  { key: "C", title: "EPリリースパーティー（キャパ150）→ 秋にワンマン250", singles: ["2027-01-29"], release: "2027-03-05", announce: "2027-01-29", show: "2027-03-20", capacity: 150, listenersTarget: 18000, showName: "リリースパーティー（キャパ150）", mvCount: 1, risk: "ワンマン250は秋に別企画として先送り。今回は動員の手応えを測る段階型。" },
];

const N = ["①", "②", "③"];

export function generatePlan(o: PlanOption, artistKey = "artist") {
  const R = o.release;
  const L = o.show;
  const last = o.singles[o.singles.length - 1];
  let i = 1;
  const tasks: Task[] = [];
  const add = (x: Omit<Task, "id" | "status" | "goals" | "lever"> & Partial<Pick<Task, "goals" | "lever">>) =>
    tasks.push({ id: `N${String(i++).padStart(2, "0")}`, status: "未着手", goals: [], lever: null, ...x });
  const A = artistKey;

  add({ ws: "plan", title: "企画の目的・ターゲット最終確認", exec: "joint", approver: "joint", start: "2026-11-16", due: "2026-11-27", trigger: "AI案の採用", doneWhen: "企画メモを合意", affects: "全工程", onChange: "方針変更は共同判断" });
  add({ ws: "plan", title: "予算・役割分担の確定", exec: "ws", approver: "joint", start: "2026-11-23", due: "2026-12-04", trigger: "企画メモ合意", doneWhen: "予算表・担当表を承認", affects: "全工程の発注", onChange: "費目間移動は共同判断" });
  add({ ws: "plan", title: "共同承認（企画書）", exec: "joint", approver: "joint", start: "2026-12-04", due: "2026-12-04", trigger: "予算・役割確定", doneWhen: "本人＋WSが承認", affects: "実行フェーズ開始", onChange: "—" });
  add({ ws: "audio", title: "収録曲の確定（5曲）", exec: A, approver: "joint", start: "2026-11-16", due: "2026-12-11", goals: ["G1"], trigger: "デモから候補抽出", doneWhen: "収録曲と曲順を確定", affects: "録音・権利確認", onChange: "差替えは楽曲管理で記録" });
  add({ ws: "audio", title: "ビート・権利条件の確認", exec: "ws", approver: "joint", start: "2026-11-30", due: "2026-12-18", trigger: "候補ビート選定", doneWhen: "条件・費用・クレジットを記録", affects: "録音・クレジット", onChange: "権利条件の変更は共同判断" });
  add({ ws: "audio", title: "先行曲① 録音・MIX・MASTER", exec: A, approver: "ws", start: addDays(o.singles[0], -60), due: addDays(o.singles[0], -29), lever: "single", goals: ["G1"], trigger: "権利条件確認", doneWhen: "納品用マスター完成", affects: "先行曲①配信登録", onChange: "—" });
  add({ ws: "audio", title: "レコーディング（残り曲）", exec: A, approver: "ws", start: addDays(R, -100), due: addDays(R, -60), trigger: "権利条件確認", doneWhen: "全曲テイク確定", affects: "MIX", onChange: "延期時はMIX・納品を再計算" });
  add({ ws: "audio", title: "MIX", exec: "eng", approver: A, start: addDays(R, -62), due: addDays(R, -44), trigger: "テイク確定", doneWhen: "全曲MIX承認", affects: "MASTER", onChange: "—" });
  add({ ws: "audio", title: "MASTER", exec: "ms", approver: A, start: addDays(R, -43), due: addDays(R, -37), trigger: "MIX承認", doneWhen: "マスター完成", affects: "配信登録", onChange: "—" });
  add({ ws: "visual", title: `MV企画・絵コンテ${o.mvCount > 1 ? "（2本）" : ""}`, exec: "film", approver: "joint", start: addDays(last, -75), due: addDays(last, -48), lever: "mv", goals: ["G1"], trigger: "MV曲の決定", doneWhen: "撮影計画承認", affects: "共通撮影", onChange: "—" });
  add({ ws: "visual", title: "共通撮影：MV＋ジャケット＋宣材写真", exec: "film", approver: "ws", start: addDays(last, -42), due: addDays(last, -42), group: "SHOOT-N", lever: "mv", goals: ["G1"], trigger: "絵コンテ承認", doneWhen: "全素材撮影完了", affects: "MV編集・ジャケット", onChange: "日程変更時はスタジオ・出演者・告知を確認" });
  add({ ws: "visual", title: "MV編集", exec: "film", approver: "joint", start: addDays(last, -41), due: addDays(last, -10), group: "SHOOT-N", lever: "mv", trigger: "素材受領", doneWhen: "MV承認", affects: "MV公開", onChange: "—" });
  add({ ws: "visual", title: "ジャケット制作", exec: "design", approver: "joint", start: addDays(last, -41), due: addDays(R, -40), group: "SHOOT-N", lever: "mv", trigger: "素材受領", doneWhen: "ジャケット承認", affects: "配信登録", onChange: "—" });
  o.singles.forEach((d, j) =>
    add({ ws: "dist", title: `先行曲${N[j]} 配信登録`, exec: "dist", approver: "ws", start: addDays(d, -28), due: addDays(d, -21), lever: "single", trigger: "マスター・ジャケ", doneWhen: "登録・審査完了", affects: "公開", onChange: "—" }),
  );
  add({ ws: "dist", title: "クレジット・権利情報の確定", exec: "acct", approver: "ws", start: addDays(R, -60), due: addDays(R, -36), trigger: "参加者確定", doneWhen: "クレジット表確定", affects: "配信登録・分配", onChange: "—" });
  add({ ws: "dist", title: "EP配信登録・納品", exec: "dist", approver: "ws", start: addDays(R, -35), due: addDays(R, -28), trigger: "マスター・クレジット確定", doneWhen: "登録完了", affects: "EP発売", onChange: "延期時は納品日を再設定" });
  o.singles.forEach((d, j) =>
    add({ ws: "promo", title: `先行曲${N[j]} 公開・SNS告知（本人投稿）`, exec: A, approver: "none", start: d, due: d, lever: "single", goals: ["G1"], trigger: "配信公開", doneWhen: "公開確認", affects: "—", onChange: "—" }),
  );
  add({ ws: "promo", title: "PR・メディア送付", exec: "pr", approver: "ws", start: addDays(last, -14), due: addDays(R, 7), lever: "pr", goals: ["G1"], trigger: "MV完成", doneWhen: "送付完了", affects: "—", onChange: "—" });
  add({ ws: "promo", title: `${o.key === "C" ? "リリースパーティー" : "ワンマン"}告知開始`, exec: "ws", approver: "joint", start: o.announce, due: o.announce, lever: "ticket", goals: ["G3"], trigger: "会場本契約・券種確定", doneWhen: "告知公開", affects: "券売", onChange: "—" });
  add({ ws: "live", title: `会場仮押さえ（キャパ${o.capacity}）`, exec: "live", approver: "ws", start: "2026-11-20", due: "2026-12-11", lever: "ticket", trigger: "AI案の採用", doneWhen: "仮押さえ確定", affects: "本契約", onChange: "—" });
  add({ ws: "live", title: "会場本契約・キャンセル規定の確認", exec: "ws", approver: "joint", start: "2026-12-07", due: "2026-12-25", lever: "ticket", trigger: "共同承認", doneWhen: "本契約（締結実務は経理・契約担当）", affects: "告知・券売", onChange: "条件変更は共同判断" });
  add({ ws: "live", title: "チケット券種・販売設計", exec: "live", approver: "ws", start: addDays(o.announce, -35), due: addDays(o.announce, -5), lever: "ticket", goals: ["G3"], trigger: "本契約", doneWhen: "券種確定", affects: "告知", onChange: "—" });
  add({ ws: "live", title: "ライブ物販の企画（個別協議）", exec: A, approver: "joint", scope: "個別協議", start: addDays(L, -70), due: addDays(L, -21), lever: "merch", goals: ["G4"], trigger: "告知", doneWhen: "物販確定", affects: "収支", onChange: "—" });
  add({ ws: "live", title: "演出・セットリスト", exec: A, approver: "joint", start: addDays(L, -50), due: addDays(L, -12), lever: "show", trigger: "EP曲確定", doneWhen: "セットリスト確定", affects: "リハ", onChange: "—" });
  add({ ws: "live", title: "リハーサル", exec: A, approver: "ws", start: addDays(L, -9), due: addDays(L, -2), lever: "show", trigger: "セットリスト確定", doneWhen: "通しリハ完了", affects: "本番", onChange: "—" });
  add({ ws: "live", title: `${o.showName} 本番`, exec: A, approver: "none", start: L, due: L, goals: ["G3"], trigger: "—", doneWhen: "終演", affects: "収支確認", onChange: "—" });
  add({ ws: "live", title: "収支の確認（数値は経理から共有）", exec: "ws", approver: "joint", start: addDays(L, 1), due: addDays(L, 28), goals: ["G4"], trigger: "精算完了の連絡", doneWhen: "収支を記録", affects: "振り返り", onChange: "—" });

  const milestones: Milestone[] = [
    { date: "2026-12-04", label: "共同承認" },
    ...o.singles.map((d, j) => ({ date: d, label: `先行曲${N[j]} 配信${j === o.singles.length - 1 ? "＋MV" : ""}` })),
    { date: R, label: o.announce === R ? "EP発売・ワンマン発表" : "EP発売" },
    ...(o.announce !== R && o.announce !== o.singles[0] ? [{ date: o.announce, label: "告知開始" }] : []),
    { date: L, label: o.key === "C" ? "リリースパーティー" : "ワンマン" },
  ].sort((a, b) => a.date.localeCompare(b.date));

  const small = o.key === "C";
  const budget: BudgetLine[] = [
    { category: "音源", item: "録音（5曲）", plan: 150000, committed: 0, paid: 0 },
    { category: "音源", item: "MIX（5曲）", plan: 150000, committed: 0, paid: 0 },
    { category: "音源", item: "MASTER", plan: 60000, committed: 0, paid: 0 },
    { category: "ビジュアル", item: `共通撮影＋MV編集${o.mvCount > 1 ? "（2本）" : ""}`, plan: o.mvCount > 1 ? 560000 : 380000, committed: 0, paid: 0 },
    { category: "ビジュアル", item: "ジャケットデザイン", plan: 80000, committed: 0, paid: 0 },
    { category: "宣伝", item: "PR・素材", plan: o.key === "B" ? 260000 : small ? 120000 : 200000, committed: 0, paid: 0 },
    { category: "ライブ", item: "会場費", plan: small ? 120000 : 300000, committed: 0, paid: 0 },
    { category: "ライブ", item: "制作・音響照明", plan: small ? 120000 : 280000, committed: 0, paid: 0 },
    { category: "ライブ", item: "スタッフ・雑費", plan: small ? 70000 : 160000, committed: 0, paid: 0 },
    { category: "グッズ", item: "物販製造（個別協議）", plan: small ? 80000 : 150000, committed: 0, paid: 0 },
    { category: "配信", item: "外部流通手数料", plan: null, committed: null, paid: null },
  ];
  return { tasks, milestones, budget };
}

export function optionSummary(o: PlanOption) {
  const g = generatePlan(o);
  const total = g.budget.reduce((s, b) => s + (b.plan ?? 0), 0);
  const required = (o.capacity / o.listenersTarget) * 100;
  return { total, required, weeks: Math.round(diffDays(o.announce, o.show) / 7), taskCount: g.tasks.length, plan: g };
}
