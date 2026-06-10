import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";
import { type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchGoogleFormTriggerRealtimeToken } from "./actions";
import { GoogleFormTriggerDialog } from "./dialog";

type GoogleFormTriggerNodeData = {
  runId?: string;
  workflowId?: string;
};

type GoogleFormTriggerNodeType = Node<GoogleFormTriggerNodeData>;

export const GoogleFormTrigger = memo(
  (props: NodeProps<GoogleFormTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const channel = useMemo(
      () =>
        props.data.workflowId
          ? googleFormTriggerChannel({ workflowId: props.data.workflowId })
          : null,
      [props.data.workflowId],
    );

    const refreshToken = useCallback(
      () => fetchGoogleFormTriggerRealtimeToken(props.data.workflowId!),
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
        <GoogleFormTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
        <BaseTriggerNode
          {...props}
          icon="/logos/googleform.svg"
          name="Google Form"
          description="When form is submitted"
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

GoogleFormTrigger.displayName = "GoogleFormTrigger";
