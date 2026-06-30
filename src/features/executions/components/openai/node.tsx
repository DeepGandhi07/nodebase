"use client";

import { OpenAIChannel } from "@/inngest/channels/open-ai";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchOpenAiRealtimeToken } from "./actions";
import { OpenAiDialog, OpenAiFormValues } from "./dialog";

type OpenAiNodeData = {
  variableName?: string;
  systemPrompt: string;
  userPrompt?: string;
  workflowId?: string;
  credentialId: string;
};

type OpenAiNodeType = Node<OpenAiNodeData>;

export const OpenAiNode = memo((props: NodeProps<OpenAiNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const channel = useMemo(
    () =>
      props.data.workflowId
        ? OpenAIChannel({ workflowId: props.data.workflowId })
        : null,
    [props.data.workflowId],
  );

  const refreshToken = useCallback(
    () => fetchOpenAiRealtimeToken(props.data.workflowId!),
    [props.data.workflowId],
  );

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel,
    refreshToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: OpenAiFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
              // runId: undefined,
            },
          };
        }
        return node;
      }),
    );
  };
  const nodeData = props.data;
  const description = nodeData?.userPrompt
    ? `gpt-4: ${nodeData.userPrompt.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <OpenAiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/openai.svg"
        name="OpenAI"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

OpenAiNode.displayName = "OpenAiNode";
