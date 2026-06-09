import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { httpRequestChannel } from "./channels/http-request";
import { NodeType } from "@/generated/prisma/enums";
import { manualTriggerChannel } from "./channels/manual-trigger";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    triggers: [{ event: "workflows/execute.workflow" }],
  },
  async ({ event, step }) => {
    const { workflowId, correlationId } = event.data;

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is missing");
    }

    if (!correlationId) {
      throw new NonRetriableError("Correlation ID is missing");
    }

    const httpCh = httpRequestChannel({ correlationId });
    const manualCh = manualTriggerChannel({ correlationId });

    const sortedNodes = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflows.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          connections: true,
        },
      });
      return topologicalSort(workflow.nodes, workflow.connections);
    });

    let context = event.data.initialData || {};

    for (const node of sortedNodes) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        context,
        step,
        httpCh,
        manualCh,
      });
    }

    return {
      workflowId,
      result: context,
    };
  },
);
