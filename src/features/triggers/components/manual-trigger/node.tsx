import { type Node, type NodeProps } from "@xyflow/react";
import { memo, useMemo, useCallback } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { MousePointerIcon } from "lucide-react";
import { ManualTriggerDialog } from "./dialog";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";
import { useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

type ManualTriggerNodeData = {
  runId?: string;
};

type ManualTriggerNodeType = Node<ManualTriggerNodeData>;

export const ManualTriggerNode = memo(
  (props: NodeProps<ManualTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const channel = useMemo(
      () =>
        props.data.runId
          ? manualTriggerChannel({ correlationId: props.data.runId })
          : null,
      [props.data.runId],
    );

    const refreshToken = useCallback(
      () => fetchManualTriggerRealtimeToken(props.data.runId!),
      [props.data.runId],
    );

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel,
      refreshToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    return (
      <>
        <ManualTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        <BaseTriggerNode
          {...props}
          icon={MousePointerIcon}
          name="When clicking 'Execute workflow'"
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

ManualTriggerNode.displayName = "ManualTriggerNode";
