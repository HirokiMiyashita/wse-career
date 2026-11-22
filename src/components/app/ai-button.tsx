"use client";

import { Button } from "@/components/ui/button";
import { openAiPanel } from "@/components/project/new-project-dialog";

export function AiButton({ label = "AIに相談" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={openAiPanel}>
      {label}
    </Button>
  );
}
