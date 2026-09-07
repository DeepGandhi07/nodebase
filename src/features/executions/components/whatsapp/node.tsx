"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchWhatsappRealtimeToken } from "./actions";
import { WhatsappDialog, type WhatsappFormValues } from "./dialog";

type WhatsappNodeData = Partial<WhatsappFormValues> & {
  workflowId?: string;
};

type WhatsappNodeType = Node<WhatsappNodeData>;

export const WhatsappNode = memo((props: NodeProps<WhatsappNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const channel = useMemo(
    () =>
      props.data.workflowId
        ? whatsappChannel({ workflowId: props.data.workflowId })
        : null,
    [props.data.workflowId],
  );

  const refreshToken = useCallback(
    () => fetchWhatsappRealtimeToken(props.data.workflowId!),
    [props.data.workflowId],
  );

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel,
    refreshToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: WhatsappFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
  };

  const description = props.data.content
    ? `Send: ${props.data.content.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <WhatsappDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/whatsapp.svg"
        name="WhatsApp"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WhatsappNode.displayName = "WhatsappNode";
