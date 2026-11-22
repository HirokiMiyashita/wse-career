/**
 * ドメインの型定義。
 * 「キャリアプラン（ゴール・柱・ステップ）→ 企画 → タスク・予算・変更 → 振り返り → レビュー」
 * の流れをそのまま型にしている。Supabase のテーブルに移すときもこの形を基準にする。
 */

export type PersonKind = "ws" | "artist" | "ext" | "tbd" | "joint" | "none";
export interface Person {
  key: string;
  name: string;
  org: string;
  kind: PersonKind;
}

export type TaskStatus = "未着手" | "進行中" | "確認待ち" | "完了" | "保留";
export type WorkstreamKey = "plan" | "audio" | "visual" | "dist" | "promo" | "live";
export type PillarKey = "work" | "live" | "fan" | "base";
export type Lever = "single" | "mv" | "pr" | "feat" | "ticket" | "show" | "merch";
export type ScopeLevel = "提供" | "個別協議" | "担当外";

/* ---------- キャリアプラン ---------- */
export interface Kpi {
  label: string;
  /** プラン策定時点の値（進み具合の起点） */
  base: number;
  now: number;
  target: number;
  unit: string;
}
export interface Pillar {
  id: PillarKey;
  name: string;
  goal: string;
  kpis: Kpi[];
}
export interface Step {
  label: string;
  text: string;
  focus: PillarKey[];
}
export interface Idea {
  id: string;
  step: number;
  title: string;
  pillars: PillarKey[];
}
export interface CareerReview {
  date: string;
  kind: string;
  participants: string;
  summary: string;
  decisions: string[];
  nextActions: string[];
}
export interface CareerPlan {
  /** 例: "2029年末" */
  horizon: string;
  years: number;
  vision: string;
  pillars: Pillar[];
  steps: Step[];
  ideas: Idea[];
  nextReview: string;
  reviews: CareerReview[];
  status: "下書き" | "確定";
  scope: Record<string, ScopeLevel> | null;
  memo?: { want: string; worry: string };
}
export interface Artist {
  id: string;
  name: string;
  role: string;
  color: string;
  plan: CareerPlan;
}

/* ---------- 企画 ---------- */
export interface Goal {
  id: string;
  label: string;
  now: number | null;
  target: number;
  unit: string;
  due: string;
  basis: string;
  pillar: PillarKey | null;
}
export interface Milestone {
  date: string;
  label: string;
}
export interface Task {
  id: string;
  ws: WorkstreamKey;
  title: string;
  /** 担当：ステータスを管理する従業員（members.id）。アーティストは割り当てない */
  assignee?: string | null;
  /** 実行：実際に手を動かす人・外部パートナーのタグ（PEOPLE のキー） */
  exec: string;
  approver: string;
  start: string;
  due: string;
  status: TaskStatus;
  goals: string[];
  lever: Lever | null;
  /** 着手条件 */
  trigger?: string;
  /** 完了条件 */
  doneWhen?: string;
  /** 影響する仕事 */
  affects?: string;
  /** 変更時の対応 */
  onChange?: string;
  /** まとめて実施（共通撮影など）のグループ */
  group?: string;
  note?: string;
  scope?: "個別協議";
}
export interface BudgetLine {
  category: string;
  item: string;
  plan: number | null;
  committed: number | null;
  paid: number | null;
}
export interface Change {
  id: string;
  date: string;
  title: string;
  type: string;
  areas: string[];
  cost: number;
  days: number;
  judgement: "重要" | "権限内";
  status: "判断待ち" | "調整済み" | "承認済み";
  by: string;
  memo: string;
}
export interface PlanModel {
  listeners: number;
  conv: number;
  capacity: number;
  price: number;
  merchRate: number;
  merchSpend: number;
  plays: number;
  perPlay: number;
  /** 本人の過去のライブ転換率（%） */
  record?: number;
}
export interface ProjectReview {
  recordedAt: string;
  kpis: { label: string; target: string; result: string; verdict: string }[];
  good: string[];
  issues: string[];
  next: string[];
  careerUpdates: string[];
}
export interface Project {
  id: string;
  artistId: string;
  title: string;
  types: string[];
  linked: string;
  /** 0:構想 1:協議 2:共同承認 3:実行中 4:公開・本番 5:振り返り */
  phase: number;
  period: string;
  purpose: string[];
  goals: Goal[];
  model: PlanModel;
  milestones: Milestone[];
  tasks: Task[];
  budget: BudgetLine[];
  changes: Change[];
  planSource: string | null;
  /** キャリアプランのどのステップの企画か */
  step: number;
  pillars: PillarKey[];
  why: string;
  review?: ProjectReview;
}

/* ---------- 横断 ---------- */
export interface Approval {
  id: string;
  kind: "change" | "task" | "deal" | "plan" | "project";
  projectId: string | null;
  artistId: string;
  ref: string;
  title: string;
  reason: string;
  due: string;
  ws: boolean;
  artist: boolean;
}
export type RightsState = "ok" | "ng" | "na";
export interface Song {
  no: string;
  title: string;
  beat: string;
  stage: number;
  rights: [RightsState, RightsState, RightsState, RightsState];
  memo: string;
}
export interface Deal {
  id: string;
  artistId: string;
  title: string;
  stage: number;
  date: string;
  fee: string;
  next: string;
  sensitive?: boolean;
}
export interface Knowledge {
  projectId: string | null;
  artistId: string;
  title: string;
  date: string;
  metrics: [string, string][];
  learning: string;
}
