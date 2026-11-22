import { api } from "@/lib/orpc/server";
import { diffDays, md, today } from "@/lib/domain/calc";
import { getArtistOr404 } from "@/server/queries";
import { AiButton } from "@/components/app/ai-button";
import { TabsNav } from "@/components/app/tabs-nav";
import { ArtistAvatar, PageHeader } from "@/components/app/ui";
import { NewProjectButton } from "@/components/project/new-project-dialog";

export default async function ArtistLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [artist, artists] = await Promise.all([getArtistOr404(id), api.artists.list()]);
  const base = `/dashboard/artists/${id}`;
  const rv = diffDays(today(), artist.plan.nextReview);
  return (
    <>
      <PageHeader
        icon={<ArtistAvatar name={artist.name} color={artist.color} size="lg" />}
        title={artist.name}
        sub={`${artist.role} ・ キャリアプラン（${artist.plan.horizon}まで）`}
        actions={
          <>
            <AiButton />
            <NewProjectButton artists={artists} artistId={id} label="＋ 企画を追加" />
          </>
        }
      />
      <TabsNav
        items={[
          { href: base, label: "キャリアプラン", exact: true },
          { href: `${base}/review`, label: "レビュー", badge: rv <= 21 ? md(artist.plan.nextReview) : undefined },
          { href: `${base}/songs`, label: "楽曲" },
          { href: `${base}/deals`, label: "案件" },
        ]}
      />
      {children}
    </>
  );
}
