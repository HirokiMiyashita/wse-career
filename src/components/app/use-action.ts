"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./overlay";

/**
 * oRPC の更新系を呼んで、成功したら画面を再取得（router.refresh）してトーストを出す。
 * 例: const { run, pending } = useAction();
 *     run(() => client.projects.updateTask({...}), "保存しました");
 */
export function useAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  async function run<T>(fn: () => Promise<T>, success?: string | ((r: T) => string)): Promise<T | undefined> {
    setPending(true);
    try {
      const r = await fn();
      router.refresh();
      if (success) toast(typeof success === "function" ? success(r) : success);
      return r;
    } catch (e) {
      toast(`エラー：${e instanceof Error ? e.message : "保存できませんでした"}`);
      return undefined;
    } finally {
      setPending(false);
    }
  }
  return { run, pending };
}
