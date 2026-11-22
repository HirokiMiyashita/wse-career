import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/members";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WelcomeForm } from "./welcome-form";

/**
 * 招待メールのリンク先。表示名とパスワードを設定してメンバーを有効にする。
 * 最初の管理者で表示名が未設定の場合も、ここで表示名だけ設定する。
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const member = user ? await getCurrentMember() : null;
  // 設定済みでもすぐには移動しない：別の人がログインしたままのブラウザで招待リンクを開いた場合、
  // URL の # 以降にある招待のトークンをクライアント側で先に処理する必要があるため
  const complete = !!member && member.status === "active" && !!member.display_name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>WSE Career へようこそ</CardTitle>
        <CardDescription>{member
            ? `${member.email} ・ ${member.status === "invited" ? `${member.kind === "employee" ? "従業員" : "アーティスト"}として招待されています` : "表示名を設定してください"}`
            : "招待メールのリンクを確認しています"}</CardDescription>
      </CardHeader>
      <WelcomeForm key={member?.id ?? "none"} complete={complete} signedIn={!!user} hasMember={!!member} needsPassword={member?.status === "invited"} defaultName={member?.display_name ?? ""} />
    </Card>
  );
}
