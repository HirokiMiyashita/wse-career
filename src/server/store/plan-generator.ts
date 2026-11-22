import { addDays, diffDays, parseDate, toISO } from "@/lib/domain/calc";
import type { Artist, BudgetLine, Milestone, Project, Task } from "@/lib/domain/types";

/**
 * 進め方の案と、採用した案を「日程・担当・予算・タスク」に展開する標準テンプレート。
 * 企画の種類（作品のリリース／ライブ）と目標から、今日を起点に3つの案を作る。
 * AI（LLM）を入れるときは、案のパラメータ（日程・規模・本数）を AI に出させ、展開はこのテンプレートで行う想定。
 */
export type OptionKey = "A" | "B" | "C";
export interface PlanOption {
  key: OptionKey;
  title: string;
  /** 先行曲の配信日 */
  singles: string[];
  /** 作品の発売日（作品を含まない企画は null） */
  release: string | null;
  releaseName: string;
  /** 告知開始日（ライブを含まない企画は null） */
  announce: string | null;
  /** 公演日（ライブを含まない企画は null） */
  show: string | null;
  showName: string;
  capacity: number;
  listenersTarget: number;
  mvCount: number;
  risk: string;
}

const RELEASE_TYPES = ["アルバム", "EP", "シングル"];
const LIVE_TYPES = ["ワンマン", "ツアー", "対バン・イベント", "企画ライブ"];
const N = ["①", "②", "③"];

export function projectShape(p: Project) {
  const releaseName = RELEASE_TYPES.find((t) => p.types.some((x) => x.startsWith(t))) ?? null;
  const liveName = LIVE_TYPES.find((t) => p.types.some((x) => x.startsWith(t))) ?? null;
  const listenersGoal = p.goals.find((g) => g.pillar === "fan" && /リスナー/.test(g.label)) ?? p.goals.find((g) => g.pillar === "fan") ?? null;
  const liveGoal = p.goals.find((g) => g.pillar === "live" && /動員/.test(g.label)) ?? p.goals.find((g) => g.pillar === "live" && g.unit === "人") ?? null;
  const moneyGoal = p.goals.find((g) => g.unit === "円以上") ?? null;
  return { releaseName, liveName, listenersGoal, liveGoal, moneyGoal };
}

/** 次の月曜（計画の起点） */
function nextMonday(now: string) {
  const d = parseDate(now);
  const add = ((8 - d.getDay()) % 7) || 7;
  return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + add));
}
/** 金曜に寄せる（配信日・発売日） */
function friday(s: string) {
  const d = parseDate(s);
  return addDays(s, (5 - d.getDay() + 7) % 7);
}
/** 土曜に寄せる（公演日） */
function saturday(s: string) {
  const d = parseDate(s);
  return addDays(s, (6 - d.getDay() + 7) % 7);
}

export function planStart(now: string) {
  return nextMonday(now);
}

export function buildOptions(p: Project, artist: Artist, now: string): PlanOption[] {
  const { releaseName, liveName, listenersGoal, liveGoal } = projectShape(p);
  const start = planStart(now);
  const listenersNow = listenersGoal?.now ?? artist.plan.pillars.find((x) => x.id === "fan")?.kpis[0]?.now ?? 0;
  const listeners = listenersGoal?.target || Math.max(p.model.listeners, listenersNow) || 10000;
  const capacity = liveGoal?.target || p.model.capacity || 200;
  const record = p.model.record ?? 1.0;
  const rel = releaseName ?? "";
  const live = liveName ?? "ライブ";
  const isSingle = releaseName === "シングル";

  const risk = (o: Omit<PlanOption, "risk">) => {
    const notes: string[] = [];
    if (o.announce && o.show) {
      const weeks = Math.round(diffDays(o.announce, o.show) / 7);
      if (weeks < 8) notes.push(`告知から本番まで${weeks}週。過去の振り返り（8〜10週）より短い。`);
      else notes.push(`告知から本番まで${weeks}週で、過去の振り返り（8〜10週）の範囲内。`);
    }
    if (o.show && o.listenersTarget) {
      const req = (o.capacity / o.listenersTarget) * 100;
      notes.push(`満員に必要な転換率${req.toFixed(2)}%（本人実績の目安 ${record}%）${req > record * 1.25 ? "で、実績を大きく上回る。" : "で、実績の範囲に近い。"}`);
    }
    if (o.mvCount > 1) notes.push("MV2本で費用が増える。");
    return notes.join("");
  };
  const make = (o: Omit<PlanOption, "risk">): PlanOption => ({ ...o, risk: risk(o) });

  // 作品だけ／ライブだけ／両方 で日程の組み方を変える
  if (releaseName && liveName) {
    const a1 = friday(addDays(start, 56));
    const aS = isSingle ? [] : [a1, friday(addDays(a1, 35))];
    const aR = isSingle ? a1 : friday(addDays(aS[aS.length - 1], 35));
    const b1 = friday(addDays(start, 56));
    const bS = isSingle ? [] : [b1, friday(addDays(b1, 28)), friday(addDays(b1, 56))];
    const bR = isSingle ? friday(addDays(start, 84)) : friday(addDays(bS[bS.length - 1], 28));
    const cS = isSingle ? [] : [friday(addDays(start, 49))];
    const cR = isSingle ? friday(addDays(start, 49)) : friday(addDays(cS[0], 35));
    return [
      make({ key: "A", title: `${isSingle ? "" : "先行2曲 → "}${rel}発売日に${live}発表 → 8週後に${live}`, singles: aS, release: aR, releaseName: rel, announce: aR, show: saturday(addDays(aR, 56)), showName: `${live}（キャパ${capacity}）`, capacity, listenersTarget: listeners, mvCount: 1 }),
      make({ key: "B", title: `${isSingle ? "" : "先行3曲（4週間隔）→ "}${rel}発売日に${live}発表 → 10週後に${live}`, singles: bS, release: bR, releaseName: rel, announce: bR, show: saturday(addDays(bR, 70)), showName: `${live}（キャパ${capacity}）`, capacity, listenersTarget: Math.round(listeners * 1.2), mvCount: 2 }),
      make({ key: "C", title: `${rel}リリースパーティー（小規模）で手応えを測り、${live}は次の企画へ`, singles: cS, release: cR, releaseName: rel, announce: cS[0] ?? addDays(cR, -42), show: saturday(addDays(cR, 14)), showName: `リリースパーティー（キャパ${Math.round(capacity * 0.6)}）`, capacity: Math.round(capacity * 0.6), listenersTarget: Math.round(listeners * 0.9), mvCount: 1 }),
    ];
  }
  if (releaseName) {
    const a1 = friday(addDays(start, 56));
    const aS = isSingle ? [] : [a1, friday(addDays(a1, 35))];
    const aR = isSingle ? a1 : friday(addDays(aS[aS.length - 1], 35));
    const b1 = friday(addDays(start, 56));
    const bS = isSingle ? [] : [b1, friday(addDays(b1, 28)), friday(addDays(b1, 56))];
    const bR = isSingle ? friday(addDays(start, 84)) : friday(addDays(bS[bS.length - 1], 28));
    const cR = friday(addDays(start, 63));
    return [
      make({ key: "A", title: isSingle ? "準備8週で配信" : `先行2曲 → ${rel}発売`, singles: aS, release: aR, releaseName: rel, announce: null, show: null, showName: "", capacity: 0, listenersTarget: listeners, mvCount: 1 }),
      make({ key: "B", title: isSingle ? "準備12週で配信＋MV2本" : `先行3曲（4週間隔）→ ${rel}発売`, singles: bS, release: bR, releaseName: rel, announce: null, show: null, showName: "", capacity: 0, listenersTarget: Math.round(listeners * 1.2), mvCount: 2 }),
      make({ key: "C", title: `先行曲なしで${rel}を発売（最短）`, singles: [], release: cR, releaseName: rel, announce: null, show: null, showName: "", capacity: 0, listenersTarget: Math.round(listeners * 0.85), mvCount: 1 }),
    ];
  }
  // ライブだけ
  const aShow = saturday(addDays(start, 112));
  const bShow = saturday(addDays(start, 140));
  const cShow = saturday(addDays(start, 84));
  return [
    make({ key: "A", title: `告知9週 → ${live}`, singles: [], release: null, releaseName: "", announce: addDays(aShow, -63), show: aShow, showName: `${live}（キャパ${capacity}）`, capacity, listenersTarget: listeners, mvCount: 0 }),
    make({ key: "B", title: `告知12週・先行チケットあり → ${live}`, singles: [], release: null, releaseName: "", announce: addDays(bShow, -84), show: bShow, showName: `${live}（キャパ${capacity}）`, capacity, listenersTarget: Math.round(listeners * 1.1), mvCount: 0 }),
    make({ key: "C", title: `小さめの会場で${live}（手応えを測る）`, singles: [], release: null, releaseName: "", announce: addDays(cShow, -56), show: cShow, showName: `${live}（キャパ${Math.round(capacity * 0.6)}）`, capacity: Math.round(capacity * 0.6), listenersTarget: listeners, mvCount: 0 }),
  ];
}

/** 採用した案を、日程・担当・予算・タスクに展開する */
export function generatePlan(o: PlanOption, p: Project, now: string) {
  const { listenersGoal, liveGoal, moneyGoal } = projectShape(p);
  const G = (g: { id: string } | null) => (g ? [g.id] : []);
  const start = planStart(now);
  const approve = addDays(start, 11);
  let i = 1;
  const tasks: Task[] = [];
  const add = (x: Omit<Task, "id" | "status" | "goals" | "lever"> & Partial<Pick<Task, "goals" | "lever">>) =>
    tasks.push({ id: `T${String(i++).padStart(2, "0")}`, status: "未着手", goals: [], lever: null, assignee: null, ...x });

  add({ ws: "plan", title: "企画の目的・ターゲット最終確認", exec: "joint", approver: "joint", start, due: addDays(start, 7), trigger: "案の採用", doneWhen: "企画メモを合意", affects: "全工程", onChange: "方針変更は共同判断" });
  add({ ws: "plan", title: "予算・役割分担の確定", exec: "ws", approver: "joint", start: addDays(start, 3), due: addDays(start, 10), trigger: "企画メモ合意", doneWhen: "予算表・担当表を承認", affects: "全工程の発注", onChange: "費目間移動は共同判断" });
  add({ ws: "plan", title: "共同承認（企画書）", exec: "joint", approver: "joint", start: approve, due: approve, trigger: "予算・役割確定", doneWhen: "本人＋WSが承認", affects: "実行フェーズ開始", onChange: "—" });

  const R = o.release;
  if (R) {
    const first = o.singles[0] ?? R;
    const last = o.singles[o.singles.length - 1] ?? R;
    const songs = o.releaseName === "アルバム" ? "10曲" : o.releaseName === "EP" ? "5曲" : "1曲";
    add({ ws: "audio", title: `収録曲の確定（${songs}）`, exec: "artist", approver: "joint", start, due: addDays(start, 21), goals: G(listenersGoal), trigger: "デモから候補抽出", doneWhen: "収録曲と曲順を確定", affects: "録音・権利確認", onChange: "差し替えは楽曲で記録" });
    add({ ws: "audio", title: "ビート・権利条件の確認", exec: "ws", approver: "joint", start: addDays(start, 7), due: addDays(start, 28), trigger: "候補ビート選定", doneWhen: "条件・費用・クレジットを記録", affects: "録音・クレジット", onChange: "権利条件の変更は共同判断" });
    o.singles.forEach((d, j) =>
      add({ ws: "audio", title: `先行曲${N[j]} 録音・MIX・MASTER`, exec: "artist", approver: "ws", start: addDays(d, -56), due: addDays(d, -29), lever: "single", goals: G(listenersGoal), trigger: "権利条件の確認", doneWhen: "納品用マスター完成", affects: `先行曲${N[j]}の配信登録`, onChange: "—" }),
    );
    if (o.releaseName !== "シングル") {
      add({ ws: "audio", title: "レコーディング（残りの曲）", exec: "artist", approver: "ws", start: addDays(start, 21), due: addDays(R, -60), trigger: "権利条件の確認", doneWhen: "全曲のテイク確定", affects: "MIX", onChange: "延期時はMIX・納品を再計算" });
      add({ ws: "audio", title: "MIX", exec: "eng", approver: "artist", start: addDays(R, -59), due: addDays(R, -44), trigger: "テイク確定", doneWhen: "全曲のMIX承認", affects: "MASTER", onChange: "—" });
      add({ ws: "audio", title: "MASTER", exec: "ms", approver: "artist", start: addDays(R, -43), due: addDays(R, -37), trigger: "MIX承認", doneWhen: "マスター完成", affects: "配信登録", onChange: "—" });
    } else if (!o.singles.length) {
      add({ ws: "audio", title: "録音・MIX・MASTER", exec: "artist", approver: "ws", start: addDays(start, 14), due: addDays(R, -29), goals: G(listenersGoal), trigger: "権利条件の確認", doneWhen: "納品用マスター完成", affects: "配信登録", onChange: "—" });
    }
    if (o.mvCount > 0) {
      const shoot = addDays(last, -42);
      add({ ws: "visual", title: `MV企画・絵コンテ${o.mvCount > 1 ? "（2本）" : ""}`, exec: "film", approver: "joint", start: addDays(shoot, -30), due: addDays(shoot, -7), lever: "mv", goals: G(listenersGoal), trigger: "MVの曲を決定", doneWhen: "撮影計画を承認", affects: "共通撮影", onChange: "—" });
      add({ ws: "visual", title: "共通撮影：MV＋ジャケット＋宣材写真", exec: "film", approver: "ws", start: shoot, due: shoot, group: "SHOOT", lever: "mv", goals: G(listenersGoal), trigger: "絵コンテの承認", doneWhen: "全素材の撮影完了", affects: "MV編集・ジャケット", onChange: "日程変更時はスタジオ・出演者・告知を確認", note: "まとめて実施：同じ場所・衣装・スタッフで撮影。仕上げと承認は成果物ごとに分ける。" });
      add({ ws: "visual", title: "MV編集", exec: "film", approver: "joint", start: addDays(shoot, 1), due: addDays(last, -7), group: "SHOOT", lever: "mv", trigger: "素材の受領", doneWhen: "MVを承認", affects: "MV公開", onChange: "—" });
      add({ ws: "visual", title: "ジャケット制作", exec: "design", approver: "joint", start: addDays(shoot, 1), due: addDays(first, -30), group: "SHOOT", trigger: "素材の受領", doneWhen: "ジャケットを承認", affects: "配信登録", onChange: "—" });
    }
    o.singles.forEach((d, j) =>
      add({ ws: "dist", title: `先行曲${N[j]} 配信登録`, exec: "dist", approver: "ws", start: addDays(d, -28), due: addDays(d, -21), lever: "single", trigger: "マスター・ジャケット", doneWhen: "登録・審査完了", affects: "公開", onChange: "—" }),
    );
    add({ ws: "dist", title: "クレジット・権利情報の確定", exec: "acct", approver: "ws", start: addDays(R, -60), due: addDays(R, -36), trigger: "参加者の確定", doneWhen: "クレジット表を確定", affects: "配信登録・分配", onChange: "客演追加時は再確認" });
    add({ ws: "dist", title: `${o.releaseName}配信登録・納品`, exec: "dist", approver: "ws", start: addDays(R, -35), due: addDays(R, -28), trigger: "マスター・クレジット確定", doneWhen: "登録完了", affects: `${o.releaseName}発売`, onChange: "延期時は納品日を再設定" });
    o.singles.forEach((d, j) =>
      add({ ws: "promo", title: `先行曲${N[j]} 公開・SNS告知（本人投稿）`, exec: "artist", approver: "none", start: d, due: d, lever: "single", goals: G(listenersGoal), trigger: "配信公開", doneWhen: "公開を確認", affects: "—", onChange: "—" }),
    );
    add({ ws: "promo", title: "PR・メディア送付", exec: "pr", approver: "ws", start: addDays(last, -14), due: addDays(R, 7), lever: "pr", goals: G(listenersGoal), trigger: "音源・MVの完成", doneWhen: "送付リスト全件に送付", affects: "—", onChange: "—" });
  }

  if (o.show && o.announce) {
    const L = o.show;
    const A = o.announce;
    const isParty = /パーティー/.test(o.showName);
    add({ ws: "live", title: `会場仮押さえ（キャパ${o.capacity}）`, exec: "live", approver: "ws", start, due: addDays(start, 21), lever: "ticket", trigger: "案の採用", doneWhen: "仮押さえ確定", affects: "本契約", onChange: "—" });
    add({ ws: "live", title: "会場本契約・キャンセル規定の確認", exec: "ws", approver: "joint", start: addDays(approve, 1), due: addDays(A, -21), lever: "ticket", goals: G(liveGoal), trigger: "共同承認", doneWhen: "本契約（締結実務は経理・契約担当）", affects: "告知・券売", onChange: "条件変更は共同判断" });
    add({ ws: "live", title: "チケット券種・販売設計", exec: "live", approver: "ws", start: addDays(A, -35), due: addDays(A, -5), lever: "ticket", goals: G(liveGoal), trigger: "会場本契約", doneWhen: "券種・価格・販売日を確定", affects: "告知", onChange: "—" });
    add({ ws: "promo", title: `${isParty ? "リリースパーティー" : o.showName.replace(/（.*）/, "")}告知開始`, exec: "ws", approver: "joint", start: A, due: A, lever: "ticket", goals: G(liveGoal), trigger: "会場本契約・券種確定", doneWhen: "告知を公開", affects: "券売", onChange: "延期時は告知文・券売日を再設定" });
    add({ ws: "live", title: "ライブ物販の企画（個別協議）", exec: "artist", approver: "joint", scope: "個別協議", start: addDays(L, -70), due: addDays(L, -21), lever: "merch", goals: G(moneyGoal), trigger: "告知", doneWhen: "物販の内容・数量を確定", affects: "収支", onChange: "—", note: "グッズ企画・販売の運営はWSの標準業務外。必要性・体制・予算に応じて個別に協議。" });
    add({ ws: "live", title: "演出・セットリスト", exec: "artist", approver: "joint", start: addDays(L, -50), due: addDays(L, -12), lever: "show", trigger: "曲の確定", doneWhen: "セットリスト・演出案を確定", affects: "リハーサル", onChange: "—" });
    add({ ws: "live", title: "リハーサル", exec: "artist", approver: "ws", start: addDays(L, -9), due: addDays(L, -2), lever: "show", trigger: "セットリスト確定", doneWhen: "通しリハ完了", affects: "本番", onChange: "—" });
    add({ ws: "live", title: `${o.showName.replace(/（.*）/, "")} 本番`, exec: "artist", approver: "none", start: L, due: L, goals: G(liveGoal), trigger: "—", doneWhen: "終演", affects: "収支確認", onChange: "—" });
    add({ ws: "live", title: "収支の確認（数値は経理から共有）", exec: "ws", approver: "joint", start: addDays(L, 1), due: addDays(L, 28), goals: G(moneyGoal), trigger: "精算完了の連絡", doneWhen: "収支を記録し振り返りへ", affects: "振り返り", onChange: "—" });
  }

  const milestones: Milestone[] = [
    { date: approve, label: "共同承認" },
    ...o.singles.map((d, j) => ({ date: d, label: `先行曲${N[j]} 配信${j === o.singles.length - 1 && o.mvCount ? "＋MV" : ""}` })),
    ...(R ? [{ date: R, label: o.announce === R ? `${o.releaseName}発売・${o.showName.replace(/（.*）/, "")}発表` : `${o.releaseName}発売` }] : []),
    ...(o.announce && o.announce !== R ? [{ date: o.announce, label: "告知開始" }] : []),
    ...(o.show ? [{ date: o.show, label: o.showName.replace(/（.*）/, "") }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const songsCount = o.releaseName === "アルバム" ? 10 : o.releaseName === "EP" ? 5 : 1;
  const small = o.capacity > 0 && o.capacity < 200;
  const budget: BudgetLine[] = [
    ...(R
      ? [
          { category: "音源", item: `録音（${songsCount}曲）`, plan: 30000 * songsCount, committed: 0, paid: 0 },
          { category: "音源", item: `MIX（${songsCount}曲）`, plan: 30000 * songsCount, committed: 0, paid: 0 },
          { category: "音源", item: "MASTER", plan: songsCount > 1 ? 60000 : 15000, committed: 0, paid: 0 },
          ...(o.mvCount
            ? [
                { category: "ビジュアル", item: `共通撮影＋MV編集${o.mvCount > 1 ? "（2本）" : ""}`, plan: o.mvCount > 1 ? 560000 : 380000, committed: 0, paid: 0 },
                { category: "ビジュアル", item: "ジャケットデザイン", plan: 80000, committed: 0, paid: 0 },
              ]
            : []),
          { category: "宣伝", item: "PR・素材", plan: o.key === "B" ? 260000 : o.key === "C" ? 120000 : 180000, committed: 0, paid: 0 },
          { category: "配信", item: "外部流通手数料", plan: null, committed: null, paid: null },
        ]
      : []),
    ...(o.show
      ? [
          { category: "ライブ", item: "会場費", plan: small ? 120000 : Math.round(o.capacity * 1000), committed: 0, paid: 0 },
          { category: "ライブ", item: "制作・音響照明", plan: small ? 120000 : 280000, committed: 0, paid: 0 },
          { category: "ライブ", item: "スタッフ・雑費", plan: small ? 70000 : 160000, committed: 0, paid: 0 },
          { category: "グッズ", item: "物販製造（個別協議）", plan: small ? 80000 : 150000, committed: 0, paid: 0 },
          ...(R ? [] : [{ category: "宣伝", item: "告知・広告素材", plan: 100000, committed: 0, paid: 0 }]),
        ]
      : []),
  ];
  return { tasks, milestones, budget };
}

export function optionSummary(o: PlanOption, p: Project, now: string) {
  const g = generatePlan(o, p, now);
  const total = g.budget.reduce((s, b) => s + (b.plan ?? 0), 0);
  const required = o.show && o.listenersTarget ? (o.capacity / o.listenersTarget) * 100 : 0;
  const weeks = o.announce && o.show ? Math.round(diffDays(o.announce, o.show) / 7) : 0;
  return { total, required, weeks, taskCount: g.tasks.length, plan: g };
}
