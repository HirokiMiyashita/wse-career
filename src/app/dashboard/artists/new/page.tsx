import { NewArtistWizard } from "@/components/artist/new-artist-wizard";
import { PageHeader } from "@/components/app/ui";

export default function NewArtistPage() {
  return (
    <>
      <PageHeader title="新しいアーティストのキャリアプラン" sub="本人との打ち合わせで一緒に埋める想定です。作ったプランは下書きになり、本人とWSの合意で確定します。" crumb={[{ href: "/dashboard", label: "ホーム" }, { label: "アーティストを追加" }]} />
      <NewArtistWizard />
    </>
  );
}
