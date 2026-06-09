import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { useReactFlow } from "@xyflow/react";
import { FlaskConicalIcon } from "lucide-react";

export const ExecuteWorkflowButton = ({
  workflowId,
}: {
  workflowId: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();
  const { setNodes } = useReactFlow();

  const handleExecute = async () => {
    const correlationId = crypto.randomUUID();

    // Set correlationId on nodes BEFORE sending event
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        data: { ...node.data, runId: correlationId },
      })),
    );

    // Now send event — subscription is already set up
    await executeWorkflow.mutateAsync({ id: workflowId, correlationId });
  };

  return (
    <Button
      size="lg"
      onClick={handleExecute}
      disabled={executeWorkflow.isPending}
    >
      <FlaskConicalIcon className="size-4" />
      Execute workflow
    </Button>
  );
};
