import type { PillarKey } from "./types";

/** AI の回答は HTML ではなく、画面側で描画する構造化ブロックで返す */
export interface AiOptionView {
  key: "A" | "B" | "C";
  title: string;
  singles: string[];
  release: string | null;
  releaseName: string;
  show: string | null;
  showName: string;
  weeks: number;
  total: number;
  required: number;
  listenersTarget: number;
  goalShare: number;
  risk: string;
}
export interface AiIdeaView {
  title: string;
  pillars: PillarKey[];
  pillarNames: string[];
  reason: string;
}
export type AiBlock =
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "note"; text: string }
  | { type: "options"; projectId: string; options: AiOptionView[] }
  | { type: "ideas"; artistId: string; step: number; ideas: AiIdeaView[] }
  | {
      type: "preview";
      projectId: string;
      option: "A" | "B" | "C";
      title: string;
      milestones: { date: string; label: string }[];
      taskCount: number;
      byWorkstream: { name: string; count: number }[];
      byPerson: { label: string; count: number }[];
      total: number;
      warnings: string[];
    };
