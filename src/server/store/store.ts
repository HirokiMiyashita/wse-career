import "server-only";
import { createSeed, type Db } from "./seed";

/**
 * 仮のデータストア（メモリ上）。
 * 開発サーバーを起動している間は変更が保持され、再起動するとサンプルデータに戻る。
 * Supabase に移すときは、routers からこのファイルの呼び出しをクエリに置き換える。
 */
const g = globalThis as unknown as { __wseDb?: Db };

export function db(): Db {
  if (!g.__wseDb) g.__wseDb = createSeed();
  return g.__wseDb;
}

export function nextId(prefix: string) {
  const d = db();
  d.seq += 1;
  return `${prefix}${d.seq}`;
}
