import Link from "next/link";
import { api } from "@/lib/orpc/server";
import { md, nextMilestone, progress, today } from "@/lib/domain/calc";
import { ArtistAvatar, Bar, Empty, Note, PageHeader, PhasePill, Tag } from "@/components/app/ui";
import { NewProjectButton } from "@/components/project/new-project-dialog";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "active", label: "進行中", test: (phase: number) => phase >= 2 && phase < 5 },
  { key: "draft", label: "構想・協議中", test: (phase: number) => phase < 2 },
  { key: "done", label: "完了", test: (phase: number) => phase >= 5 },
  { key: "all", label: "すべて", test: () => true },
];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "active" } = await searchParams;
  const [artists, projects] = await Promise.all([api.artists.list(), api.projects.list()]);
  const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
  const list = projects.filter((p) => f.test(p.phase));
  const now = today();
  return (
    <>
      <PageHeader title="企画一覧" sub="すべての企画は、いずれかのアーティストのキャリアプランのステップにつながっています" actions={<NewProjectButton artists={artists} />} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/dashboard/projects?filter=${x.key}`}
            className={cn("flex h-8 items-center rounded-full border px-3 text-[12.5px] font-medium", x.key === f.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-slate-600 hover:border-primary hover:text-primary")}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title="該当する企画はありません" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const a = artists.find((x) => x.id === p.artistId);
            const st = a?.plan.steps[p.step];
            const n = nextMilestone(p, now);
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="relative block overflow-hidden rounded-xl border bg-card p-5 shadow-xs transition hover:border-indigo-200 hover:shadow-md">
                <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: a?.color }} />
                <div className="mt-0.5 flex items-center gap-2">
                  {a && <ArtistAvatar name={a.name} color={a.color} size="sm" />}
                  <span className="text-[12.5px] text-slate-500">{a?.name}</span>
                  <span className="ml-auto">
                    <PhasePill phase={p.phase} />
                  </span>
                </div>
                <div className="mb-0.5 mt-2.5 text-[15px] font-bold leading-snug">{p.title}</div>
                <div className="text-[11.5px] text-muted-foreground">
                  {p.types.join("＋")} ・ {p.period}
                </div>
                {st && (
                  <Note tone="primary" className="my-3 px-2.5 py-2">
                    <b className="text-[11.5px]">キャリアでの役割</b>
                    <br />
                    <span className="text-[11.5px]">
                      {st.label}：{st.text}
                    </span>
                  </Note>
                )}
                {p.tasks.length ? (
                  <div className="flex items-center gap-2">
                    <Bar value={progress(p)} className="flex-1" />
                    <span className="text-[11.5px] text-muted-foreground">{progress(p)}%</span>
                  </div>
                ) : (
                  <Tag variant="dashed">計画はこれから</Tag>
                )}
                {n && (
                  <div className="mt-2 text-[11.5px] text-muted-foreground">
                    次：{md(n.date)} {n.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
