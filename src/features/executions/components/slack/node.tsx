"use client";

import { SlackChannel } from "@/inngest/channels/slack";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchSlackRealtimeToken } from "./actions";
import { SlackDialog, SlackFormValues } from "./dialog";

type SlackNodeData = {
  webhookUrl?: string;
  content?: string;
  workflowId: string;
  username: string;
};

type SlackNodeType = Node<SlackNodeData>;

export const SlackNode = memo((props: NodeProps<SlackNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const channel = useMemo(
    () =>
      props.data.workflowId
        ? SlackChannel({ workflowId: props.data.workflowId })
        : null,
    [props.data.workflowId],
  );

  const refreshToken = useCallback(
    () => fetchSlackRealtimeToken(props.data.workflowId!),
    [props.data.workflowId],
  );

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel,
    refreshToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: SlackFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      }),
    );
  };

  const nodeData = props.data;
  const description = nodeData?.content
    ? `Send: ${nodeData.content.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <SlackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/slack.svg"
        name="Slack"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

SlackNode.displayName = "SlackNode";
