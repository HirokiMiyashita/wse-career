import type { Lever, Person, ScopeLevel, TaskStatus, WorkstreamKey } from "./types";

export const PEOPLE: Record<string, Person> = {
  ws: { key: "ws", name: "WS（社内）", org: "WS", kind: "ws" },
  joint: { key: "joint", name: "本人＋WS", org: "共同", kind: "joint" },
  artist: { key: "artist", name: "本人", org: "本人", kind: "artist" },
  eng: { key: "eng", name: "録音・MIXエンジニア", org: "外部", kind: "ext" },
  ms: { key: "ms", name: "マスタリング", org: "外部", kind: "ext" },
  film: { key: "film", name: "映像チーム", org: "外部", kind: "ext" },
  design: { key: "design", name: "デザイナー", org: "外部", kind: "ext" },
  dist: { key: "dist", name: "外部流通（提携先 未確定）", org: "外部", kind: "ext" },
  live: { key: "live", name: "ライブ制作", org: "外部", kind: "ext" },
  pr: { key: "pr", name: "PR担当", org: "外部", kind: "ext" },
  acct: { key: "acct", name: "経理・契約", org: "要指定", kind: "tbd" },
  none: { key: "none", name: "—", org: "", kind: "none" },
};

/** 実行タグが外部（アプリに入らない人）か */
export const isExternalExec = (key: string) => ["ext", "tbd"].includes(PEOPLE[key]?.kind ?? "");

export function personName(key: string, artistName?: string) {
  if (key === "artist") return artistName ?? "本人";
  return PEOPLE[key]?.name ?? key;
}

export const WORKSTREAMS: { key: WorkstreamKey; name: string; role: string }[] = [
  { key: "plan", name: "企画", role: "本人＋WSで協議・共同承認" },
  { key: "audio", name: "音源", role: "本人・制作先が実行／WSは構成・品質を協議" },
  { key: "visual", name: "ビジュアル", role: "方向性は本人＋WS／実制作は外部" },
  { key: "dist", name: "配信", role: "登録は外部流通／WSは進行確認" },
  { key: "promo", name: "宣伝", role: "WS＋外部が共同実行" },
  { key: "live", name: "ライブ", role: "方針は本人＋WS／制作運営は外部" },
];
export const WS_NAME: Record<WorkstreamKey, string> = Object.fromEntries(
  WORKSTREAMS.map((w) => [w.key, w.name]),
) as Record<WorkstreamKey, string>;

export const PHASES = ["構想", "協議", "共同承認", "実行中", "公開・本番", "振り返り"] as const;
export const TASK_STATUSES: TaskStatus[] = ["未着手", "進行中", "確認待ち", "完了", "保留"];
export const BOARD_COLUMNS: TaskStatus[] = ["未着手", "進行中", "確認待ち", "完了"];

export const LEVERS: Record<Lever, string> = {
  single: "先行曲リリース",
  mv: "MV・ビジュアル",
  pr: "PR・メディア",
  feat: "客演",
  ticket: "告知・券売",
  show: "演出・リハ",
  merch: "ライブ物販",
};

/** WS の標準業務（提案資料の業務範囲） */
export const WS_CORE: { area: string; items: string[] }[] = [
  {
    area: "BUSINESS",
    items: ["出演・案件の問い合わせ窓口", "ライブ出演料・契約条件の交渉", "ブランド案件・タイアップの交渉", "契約書の確認と専門家への相談調整"],
  },
  { area: "CAREER & CREATIVE", items: ["中長期のキャリア方針の相談", "ブランディングの相談", "リリース方針・優先順位の協議"] },
  { area: "LABEL RELATIONS", items: ["外部レーベルとの連絡・条件調整", "リリース進行状況の確認"] },
  {
    area: "OPERATIONS",
    items: ["重要なライブ・商談への同行", "重要案件のスケジュール調整", "月次の活動・収益状況の確認", "案件の進捗・期限の管理"],
  },
];
export const CONDITIONAL_SCOPE = ["ブランド・メディアとの関係構築", "MV・ジャケット制作の手配", "外部クリエイターの紹介・調整", "グッズ企画・販売の運営"];
export const OUT_OF_SCOPE = [
  "新規案件の積極的な営業開拓",
  "請求・入金・精算状況の管理実務",
  "SNSの投稿制作・日常運用",
  "広告・プロモーションの実行",
  "すべてのライブ・撮影への同行",
  "日常の移動・宿泊・生活サポート",
  "ファンクラブ・コミュニティ運営",
];
export function defaultScope(): Record<string, ScopeLevel> {
  const scope: Record<string, ScopeLevel> = {};
  WS_CORE.forEach((c) => c.items.forEach((i) => (scope[i] = "提供")));
  CONDITIONAL_SCOPE.forEach((i) => (scope[i] = "個別協議"));
  OUT_OF_SCOPE.forEach((i) => (scope[i] = "担当外"));
  return scope;
}

export const SONG_STAGES = ["候補", "ビート条件", "録音", "MIX", "MASTER", "完成"];
export const RIGHTS_LABELS = ["独占利用", "著作権", "原盤", "印税分配"];
export const DEAL_STAGES = ["問い合わせ", "一次評価", "交渉", "受諾判断", "実施", "事後確認"];

export const BENCHMARKS: { label: string; value: string; source: string }[] = [
  { label: "ライブ転換率（動員÷月間リスナー）", value: "0.8〜1.5%", source: "2件" },
  { label: "物販購買率", value: "30〜38%", source: "2件" },
  { label: "告知開始 → 本番", value: "8〜10週", source: "SHUN 連続配信の振り返り" },
  { label: "共通撮影の費用効果", value: "個別手配比 約−20%", source: "SHUN 連続配信の振り返り" },
];

/** よくある変更（業務フロー06）。keywords はタスク名との照合に使う */
export const CHANGE_TEMPLATES: { key: string; type: string; areas: string[]; cost: number; days: number; keywords: string[] }[] = [
  { key: "客演追加", type: "追加", areas: ["録音日", "契約・権利", "MIX", "配信クレジット", "予算"], cost: 80000, days: 0, keywords: ["客演", "MIX", "クレジット", "権利"] },
  { key: "MV撮影日変更", type: "延期", areas: ["スタジオ", "出演者", "ジャケット撮影", "編集", "告知"], cost: 0, days: 7, keywords: ["撮影", "MV", "編集", "ジャケット"] },
  { key: "発売延期", type: "延期", areas: ["配信納品", "先行曲", "広告", "ライブ告知", "費用"], cost: 0, days: 14, keywords: ["配信", "告知", "プロモーション", "PR"] },
  { key: "ワンマンを途中追加", type: "追加", areas: ["会場", "券売", "作品の施策", "予算", "人員"], cost: 600000, days: 0, keywords: ["会場", "チケット", "告知"] },
  { key: "その他", type: "その他", areas: [], cost: 0, days: 0, keywords: [] },
];
export const BASE_CHANGE_AREAS = ["品質", "費用", "日程", "権利", "関係者"];

export const ARTIST_COLORS = ["#2B8A3E", "#D6336C", "#1971C2", "#5F3DC4", "#E67700"];
