"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { MailIcon } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { emailTriggerChannel } from "@/inngest/channels/email-trigger";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchEmailTriggerRealtimeToken } from "./actions";
import { EmailTriggerDialog, type EmailTriggerFormValues } from "./dialog";

type EmailTriggerNodeData = {
  workflowId?: string;
  credentialId?: string;
  fromFilter?: string;
  subjectFilter?: string;
};

type EmailTriggerNodeType = Node<EmailTriggerNodeData>;

export const EmailTriggerNode = memo(
  (props: NodeProps<EmailTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const channel = useMemo(
      () =>
        props.data.workflowId
          ? emailTriggerChannel({ workflowId: props.data.workflowId })
          : null,
      [props.data.workflowId],
    );

    const refreshToken = useCallback(
      () => fetchEmailTriggerRealtimeToken(props.data.workflowId!),
      [props.data.workflowId],
    );

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel,
      refreshToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: EmailTriggerFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...values } }
            : node,
        ),
      );
    };

    const description = props.data.fromFilter
      ? `When email from ${props.data.fromFilter} arrives`
      : "When an email is received";

    return (
      <>
        <EmailTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={props.data}
        />
        <BaseTriggerNode
          {...props}
          icon={MailIcon}
          name="Email"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

EmailTriggerNode.displayName = "EmailTriggerNode";
