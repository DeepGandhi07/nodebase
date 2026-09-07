"use client";

import type { Edge, Node } from "@xyflow/react";
import { SparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateWorkflow } from "@/features/workflows/hooks/use-workflows";

const EXAMPLE_PROMPT =
  "When I receive a customer email, summarize it, classify its urgency and send me a WhatsApp message if it is urgent";

interface Props {
  workflowId: string;
  onGenerated: (workflow: { nodes: Node[]; edges: Edge[] }) => void;
}

export const GenerateWorkflowPanel = ({ workflowId, onGenerated }: Props) => {
  const [prompt, setPrompt] = useState("");
  const generateWorkflow = useGenerateWorkflow();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const workflow = await generateWorkflow.mutateAsync({
      id: workflowId,
      prompt,
    });

    onGenerated(workflow as { nodes: Node[]; edges: Edge[] });
  };

  return (
    <div className="w-[320px] rounded-lg border bg-background p-3 shadow-sm space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <SparklesIcon className="size-4" />
        Describe your automation
      </div>
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={EXAMPLE_PROMPT}
        className="min-h-[90px] text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Generating replaces the nodes currently on the canvas.
      </p>
      <Button
        type="button"
        className="w-full"
        onClick={handleGenerate}
        disabled={generateWorkflow.isPending || !prompt.trim()}
      >
        {generateWorkflow.isPending ? "Generating..." : "Generate workflow"}
      </Button>
    </div>
  );
};
