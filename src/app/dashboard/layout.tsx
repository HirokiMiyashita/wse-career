import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/orpc/server";
import { AiPanel } from "@/components/app/ai-panel";
import { ToastProvider } from "@/components/app/overlay";
import { Sidebar } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";
import { today, ymd, weekday } from "@/lib/domain/calc";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts でも保護しているが、念のためサーバー側でも確認する
  if (!user) redirect("/login?next=/dashboard");

  const [artists, projects, approvals] = await Promise.all([api.artists.list(), api.projects.list(), api.approvals.list()]);
  const now = today();

  return (
    <ToastProvider>
      <div className="flex min-h-svh flex-col md:flex-row">
        <Sidebar
          email={user.email ?? null}
          pending={approvals.filter((a) => !(a.ws && a.artist)).length}
          artists={artists.map((a) => ({ id: a.id, name: a.name, color: a.color, label: a.plan.status === "下書き" ? "下書き" : a.plan.horizon.slice(0, 4) }))}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-amber-200/70 bg-amber-50 px-4 py-1.5 text-xs text-amber-900 md:px-8">
            <span>デモ版：表示している数値・案件・担当はサンプルです（サーバー再起動で元に戻ります）</span>
            <span className="flex items-center gap-3">
              <span className="hidden sm:inline">
                {ymd(now)}（{weekday(now)}）
              </span>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit" className="h-7 bg-white text-xs">
                  ログアウト
                </Button>
              </form>
            </span>
          </header>
          <main className="w-full max-w-[1360px] flex-1 px-4 pb-28 pt-6 md:px-8">{children}</main>
        </div>
      </div>
      <AiPanel
        artists={artists.map((a) => ({ id: a.id, name: a.name, horizon: a.plan.horizon, nextStepLabel: a.plan.steps[1]?.label ?? null }))}
        projects={projects.map((p) => ({ id: p.id, title: p.title, artistId: p.artistId, hasPlan: p.tasks.length > 0 }))}
      />
    </ToastProvider>
  );
}
