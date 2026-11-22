"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "./actions";

export function WelcomeForm({ complete, signedIn, hasMember, needsPassword, defaultName }: { complete: boolean; signedIn: boolean; hasMember: boolean; needsPassword: boolean; defaultName: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "ready" | "invalid">("checking");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 招待リンクはトークンを URL の # 以降に付けて戻ってくるので、ここでセッションにする
  // （別の人がログイン中でも、招待されたアカウントに切り替える）
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    (async () => {
      if (access_token && refresh_token) {
        const { error: e } = await createClient().auth.setSession({ access_token, refresh_token });
        window.history.replaceState(null, "", window.location.pathname);
        if (e) return setPhase("invalid");
        setPhase("ready");
        router.refresh();
        return;
      }
      if (hash.get("error")) window.history.replaceState(null, "", window.location.pathname);
      if (complete) router.replace("/dashboard");
      else setPhase(signedIn ? "ready" : "invalid");
    })();
  }, [complete, signedIn, router]);

  if (phase === "checking") return <CardContent className="text-sm text-muted-foreground">確認しています…</CardContent>;
  if (phase === "invalid" || (signedIn && !hasMember))
    return (
      <>
        <CardContent className="text-sm text-muted-foreground">
          {signedIn ? "このアカウントは招待されていません。" : "リンクが無効か、有効期限が切れています。"}管理者に招待の再送を依頼してください。
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">ログイン画面へ</Link>
          </Button>
        </CardFooter>
      </>
    );

  async function submit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      if (needsPassword) {
        const password = String(formData.get("password") ?? "");
        if (password.length < 8) return setError("パスワードは8文字以上にしてください");
        if (password !== formData.get("password2")) return setError("確認用のパスワードが一致しません");
        const { error: e } = await createClient().auth.updateUser({ password });
        if (e) return setError(`パスワードを設定できませんでした：${e.message}`);
      }
      const r = await completeOnboarding(String(formData.get("name") ?? ""));
      if (r?.message) setError(r.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={submit}>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-2">
          <Label htmlFor="name">表示名（タスクの担当として表示されます）</Label>
          <Input id="name" name="name" defaultValue={defaultName} required placeholder="例：宮下" />
        </div>
        {needsPassword && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="password">パスワード（8文字以上）</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password2">パスワード（確認）</Label>
              <Input id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="mt-6">
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "保存中…" : "はじめる"}
        </Button>
      </CardFooter>
    </form>
  );
}
