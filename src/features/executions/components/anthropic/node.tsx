"use client";

import { AnthropicChannel } from "@/inngest/channels/anthropic";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchAnthropicRealtimeToken } from "./actions";
import { AnthropicDialog, AnthropicFormValues } from "./dialog";

type AnthropicNodeData = {
  variableName?: string;
  systemPrompt: string;
  userPrompt?: string;
  workflowId?: string;
  credentialId: string;
};

type AnthropicNodeType = Node<AnthropicNodeData>;

export const AnthropicNode = memo((props: NodeProps<AnthropicNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const channel = useMemo(
    () =>
      props.data.workflowId
        ? AnthropicChannel({ workflowId: props.data.workflowId })
        : null,
    [props.data.workflowId],
  );

  const refreshToken = useCallback(
    () => fetchAnthropicRealtimeToken(props.data.workflowId!),
    [props.data.workflowId],
  );

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel,
    refreshToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: AnthropicFormValues) => {
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
    ? `claude-sonnet-4-5: ${nodeData.userPrompt.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <AnthropicDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/anthropic.svg"
        name="Anthropic"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

AnthropicNode.displayName = "AnthropicNode";
