import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { stripeTriggerChannel } from "@/inngest/channels/stripe-trigger";
import { type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchStripeTriggerRealtimeToken } from "./actions";
import { StripeTriggerDialog } from "./dialog";

type StripeTriggerNodeData = {
  runId?: string;
  workflowId?: string;
};

type StripeTriggerNodeType = Node<StripeTriggerNodeData>;

export const StripeTriggerNode = memo(
  (props: NodeProps<StripeTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const channel = useMemo(
      () =>
        props.data.workflowId
          ? stripeTriggerChannel({ workflowId: props.data.workflowId })
          : null,
      [props.data.workflowId],
    );

    const refreshToken = useCallback(
      () => fetchStripeTriggerRealtimeToken(props.data.workflowId!),
      [props.data.workflowId],
    );

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel,
      refreshToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    return (
      <>
        <StripeTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        <BaseTriggerNode
          {...props}
          icon="/logos/stripe.svg"
          name="Stripe"
          description="When stripe event is captured"
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

StripeTriggerNode.displayName = "StripeTrigger";
