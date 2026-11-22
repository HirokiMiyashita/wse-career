import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">認証に失敗しました</h1>
      <p className="text-sm text-muted-foreground">
        リンクの有効期限が切れているか、登録時と別のブラウザで開かれた可能性があります。
      </p>
      <Button asChild>
        <Link href="/login">ログイン画面へ</Link>
      </Button>
    </div>
  );
}
