import Link from "next/link";
import { Button } from "@/components/ui/button";

// TODO: LP 本実装（仮の骨組み）
export default function LandingPage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">LP（仮）</h1>
      <p className="text-muted-foreground">
        認証不要でアクセスできるランディングページです。
      </p>
      <Button size="lg" asChild>
        <Link href="/signup">はじめる</Link>
      </Button>
    </section>
  );
}
