# wse-career

WSE 社内向けの「アーティストのキャリアプランと企画」の管理ツール。
Next.js 16 + Supabase + oRPC + shadcn/ui のスターター（create-nso-stack で作成）の上に実装している。

## WSE Career（アプリ）

マネジメントの本質＝中長期のキャリアプランの設計と伴走、という考え方で、
**キャリアプラン（ゴール・柱・ステップ）→ 企画 → タスク・予算・変更 → 振り返り → キャリアレビュー** を一続きで扱う。

### 画面（ログイン後 `/dashboard` 配下）

| パス | 画面 |
| --- | --- |
| `/dashboard` | ホーム（アーティストの現在地、今週やること、判断待ち、これからの予定） |
| `/dashboard/artists/new` | アーティストを追加（キャリアプラン作成：6ステップ。保存すると下書き） |
| `/dashboard/artists/[id]` | キャリアプラン（目指す姿・柱・ロードマップ・業務範囲） |
| `/dashboard/artists/[id]/review` | キャリアレビュー（自動の議題・記録・履歴） |
| `/dashboard/artists/[id]/songs` `/deals` | 楽曲（制作段階・権利の確認状況）／案件 |
| `/dashboard/projects` | 企画一覧 |
| `/dashboard/projects/[id]` | 企画の概要（キャリアでの役割・目標・計画チェック） |
| `/dashboard/projects/[id]/schedule` | スケジュール（ガントチャート） |
| `/dashboard/projects/[id]/tasks` | タスク（ボード／流れ別リスト・詳細の編集。`?task=ID` で詳細を開く） |
| `/dashboard/projects/[id]/budget` `/changes` `/review` | 予算／変更（判定つき）／振り返り |
| `/dashboard/approvals` | 判断待ち（WS の承認＋本人の確認で確定） |
| `/dashboard/knowledge` | ナレッジ |

右下の「AIに相談」は全画面共通。開いている画面（アーティスト・企画）を文脈として回答する。

### 試すときの順番

1. ホーム → CARZ のカード → 柱をクリック（関係する企画だけ強調）
2. NOA（仮）→「AIに相談」→ 2nd EP の進め方の案 → 案を選んで「企画に反映する」→ スケジュール
3. 企画のタスク → カードをドラッグして状態を変える／カードを開いて編集
4. サイドバーの「＋ アーティストを追加」→ サンプルを入力 → 各ステップのAIボタン → 保存 → 判断待ちで確定

### コードの構成

```
src/lib/domain/        型・定数・計算（画面とサーバーで共通。純粋な関数のみ）
  types.ts             キャリアプラン／企画／タスク／予算／変更／判断待ち など
  calc.ts              日付・進み具合・計画チェック・変更の判定
  agenda.ts            キャリアレビューの議題の自動作成
  ai.ts                AI の回答ブロックの型
src/server/store/      仮のデータストア（メモリ上）とサンプルデータ、進め方の案のテンプレート
src/server/orpc/routers/
  artists.ts           一覧・取得・作成（下書き）・レビュー記録・構想の追加
  projects.ts          一覧・取得・作成・タスク更新・変更の記録・AI案の反映
  approvals.ts         判断待ち（両方の確認で確定し、元の変更・タスク・プランに反映）
  library.ts           楽曲・案件・ナレッジ
  ai.ts                AI 相談（デモ版は決まった質問に、社内データから組み立てた回答）
src/components/app/    共通部品（サイドバー・タブ・パネル・ピル・シート・トースト・AIパネル）
src/components/{home,artist,project,approvals}/   画面ごとの部品
```

### いまの制約と次の一手

- **データはメモリ上**（`src/server/store`）。開発サーバーを再起動するとサンプルデータに戻る。
  次は Supabase にテーブルを作り、`routers/*.ts` の `db()` 呼び出しをクエリに置き換える（型は `src/lib/domain/types.ts` を基準にする）。
- **AI はデモ版**。`routers/ai.ts` で LLM API を呼び、同じ `AiBlock` 形式で返せば画面はそのまま使える。
- 「テンプレートから作る」「ゴールの編集」はまだ実装していない（ボタンは案内のみ）。
- 変更の判定基準（10万円・14日など）は仮の値。`src/lib/domain/calc.ts` の `isImportantChange` で調整する。

## 技術スタック

- Next.js 16（App Router / Turbopack / `src/proxy.ts`）
- oRPC（型安全な API、TanStack Query 連携）
- Supabase（DB・Auth）／ローカルは Supabase CLI
- Tailwind CSS v4 + shadcn/ui（new-york / neutral）

## セットアップ

前提: Node.js 20.9 以上、Docker Desktop（Supabase CLI がコンテナでローカル環境を起動します）

```bash
npm install

# ローカル Supabase を起動（初回はイメージ取得に時間がかかります）
npm run db:start

# 表示された API URL と Publishable key（または anon key）を .env.local に設定
cp .env.example .env.local

npm run dev
```

| URL | 内容 |
| --- | --- |
| http://localhost:3000 | アプリ |
| http://127.0.0.1:54323 | Supabase Studio |
| http://127.0.0.1:54324 | ローカルのメール受信箱（確認メールはここに届きます） |

## 画面構成

| パス | 認証 | 説明 |
| --- | --- | --- |
| `/` | 不要 | LP（`src/app/(marketing)`） |
| `/login` `/signup` | 不要 | 認証画面（`src/app/(auth)`）。ログイン済みなら `/dashboard` へ |
| `/signup/verify` | 不要 | 確認メール送信完了 |
| `/auth/callback` | — | 確認メールのリンクからの戻り先。code をセッションに交換 |
| `/dashboard/**` | 必要 | ダッシュボード。未ログインなら `/login` へ |

| `/rpc/**` | プロシージャごと | oRPC エンドポイント |

認証が必要なパスは `src/lib/supabase/proxy.ts` の `PROTECTED_PREFIXES` で管理しています。

## API（oRPC）

```
src/server/orpc/
  context.ts        リクエストごとのコンテキスト（Supabase クライアント）
  base.ts           publicProcedure / authedProcedure（未ログインは UNAUTHORIZED）
  router.ts         ルーター本体（ここに追加）
  routers/*.ts      機能ごとのプロシージャ
src/app/rpc/[[...rest]]/route.ts   HTTP エンドポイント（/rpc）
src/lib/orpc/server.ts             Server Component / Server Action 用: api.me.get()
src/lib/orpc/client.ts             Client Component 用: useQuery(orpc.health.ping.queryOptions())
```

プロシージャの追加例:

```ts
// src/server/orpc/routers/todos.ts
import { z } from "zod";
import { authedProcedure } from "../base";

export const todosRouter = {
  list: authedProcedure
    .input(z.object({ limit: z.number().int().max(100).default(20) }))
    .handler(async ({ input, context }) => {
      const { data } = await context.supabase.from("todos").select("*").limit(input.limit);
      return data ?? [];
    }),
};
```

`router.ts` に `todos: todosRouter` を追加すれば、`api.todos.list()` / `orpc.todos.list.queryOptions()` で型付きで呼べます。

## メール認証

`supabase/config.toml` の `[auth.email] enable_confirmations = true` により、ローカルでもメール確認が必須です。
登録 → http://127.0.0.1:54324 で確認メールを開く → リンクを踏むとダッシュボードへ遷移します。
（PKCE フローのため、登録したのと同じブラウザでリンクを開いてください）

## よく使うコマンド

```bash
npm run db:status                 # URL・キーの確認
npm run db:migration:new <name>   # マイグレーション作成（supabase/migrations）
npm run db:reset                  # DB を作り直してマイグレーション・seed を再適用
npm run db:types                  # DB の型を src/lib/supabase/database.types.ts に生成
npx shadcn@latest add <component> # shadcn/ui コンポーネント追加
```
