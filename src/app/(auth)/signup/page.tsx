import Link from "next/link";
import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

/** 新規登録は最初の管理者だけ。以降は招待制（招待メールのリンクから /welcome で登録） */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: open } = await supabase.rpc("signup_open");

  if (open === false)
    return (
      <Card>
        <CardHeader>
          <CardTitle>新規登録は招待制です</CardTitle>
          <CardDescription>管理者から届いた招待メールのリンクを開いて、表示名とパスワードを設定してください。</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">ログイン画面へ</Link>
          </Button>
        </CardFooter>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規登録</CardTitle>
        <CardDescription>最初の登録者が管理者になります。登録後、確認メールが送信されます</CardDescription>
      </CardHeader>
      <form action={signup}>
        <CardContent className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">パスワード（8 文字以上）</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full">
            登録する
          </Button>
          <p className="text-sm text-muted-foreground">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="underline">
              ログイン
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
