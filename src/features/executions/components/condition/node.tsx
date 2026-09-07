"use client";

import {
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { SplitIcon } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import WorkflowNode from "@/components/workflow-node";
import { conditionChannel } from "@/inngest/channels/condition";
import { useNodeStatus } from "../../hooks/use-node-status";
import { FALSE_HANDLE, TRUE_HANDLE } from "../../lib/branching";
import { fetchConditionRealtimeToken } from "./actions";
import { ConditionDialog, type ConditionFormValues } from "./dialog";

type ConditionNodeData = ConditionFormValues & {
  workflowId?: string;
};

type ConditionNodeType = Node<Partial<ConditionNodeData>>;

export const ConditionNode = memo((props: NodeProps<ConditionNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const channel = useMemo(
    () =>
      props.data.workflowId
        ? conditionChannel({ workflowId: props.data.workflowId })
        : null,
    [props.data.workflowId],
  );

  const refreshToken = useCallback(
    () => fetchConditionRealtimeToken(props.data.workflowId!),
    [props.data.workflowId],
  );

  const status = useNodeStatus({ nodeId: props.id, channel, refreshToken });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ConditionFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
  };

  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== props.id));
  };

  const description = props.data.leftValue
    ? `${props.data.leftValue} ${props.data.operator ?? "contains"} ${
        props.data.rightValue ?? ""
      }`
    : "Not configured";

  return (
    <>
      <ConditionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <WorkflowNode
        name="Condition"
        description={description}
        onDelete={handleDelete}
        onSettings={handleOpenSettings}
      >
        <NodeStatusIndicator status={status} variant="border">
          <BaseNode onDoubleClick={handleOpenSettings} status={status}>
            <BaseNodeContent>
              <SplitIcon className="size-4 rotate-90 text-muted-foreground" />
              <BaseHandle
                id="target-1"
                type="target"
                position={Position.Left}
              />
              <BaseHandle
                id={TRUE_HANDLE}
                type="source"
                position={Position.Right}
                style={{ top: "30%" }}
                className="bg-green-500 border-green-600"
              />
              <BaseHandle
                id={FALSE_HANDLE}
                type="source"
                position={Position.Right}
                style={{ top: "70%" }}
                className="bg-red-500 border-red-600"
              />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
    </>
  );
});

ConditionNode.displayName = "ConditionNode";
