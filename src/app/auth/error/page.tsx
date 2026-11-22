import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/dashboard/actions";

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  if (reason === "no_member")
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">このアカウントでは利用できません</h1>
        <p className="text-sm text-muted-foreground">メンバーとして登録されていないか、利用が停止されています。管理者に招待を依頼してください。</p>
        <form action={signOut}>
          <Button type="submit">ログアウト</Button>
        </form>
      </div>
    );
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">認証に失敗しました</h1>
      <p className="text-sm text-muted-foreground">
        リンクの有効期限が切れているか、登録時と別のブラウザで開かれた可能性があります。招待メールの場合は、管理者に再送を依頼してください。
      </p>
      <Button asChild>
        <Link href="/login">ログイン画面へ</Link>
      </Button>
    </div>
  );
}
