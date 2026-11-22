"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Client Component から oRPC + TanStack Query を使う例 */
export function HealthCard() {
  const { data, isPending, error } = useQuery(orpc.health.ping.queryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle>API ステータス</CardTitle>
        <CardDescription>health.ping（クライアントから呼び出し）</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {isPending ? "確認中..." : error ? `エラー: ${error.message}` : `${data.status} / ${data.time}`}
      </CardContent>
    </Card>
  );
}
