import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { httpRequestChannel } from "./channels/http-request";
import { ExecutionStatus, NodeType } from "@/generated/prisma/enums";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { geminiChannel } from "./channels/gemini";
import { OpenAIChannel } from "./channels/open-ai";
import { AnthropicChannel } from "./channels/anthropic";
import { discordChannel } from "./channels/discord";
import { SlackChannel } from "./channels/slack";
import { conditionChannel } from "./channels/condition";
import { emailTriggerChannel } from "./channels/email-trigger";
import { whatsappChannel } from "./channels/whatsapp";
import {
  getBranchDecisions,
  isNodeSkipped,
  stripBranchDecisions,
} from "@/features/executions/lib/branching";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event, step }) => {
      return prisma.execution.update({
        where: { inngestEventId: event.data.event.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
    triggers: [{ event: "workflows/execute.workflow" }],
  },
  async ({ event, step }) => {
    const inngestEventId = event.id;
    const { workflowId, correlationId } = event.data;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or Workflow ID is missing");
    }

    await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
        },
      });
    });

    if (!correlationId) {
      throw new NonRetriableError("Correlation ID is missing");
    }

    const httpCh = httpRequestChannel({ workflowId });
    const manualCh = manualTriggerChannel({ correlationId });
    const googleFormCh = googleFormTriggerChannel({ workflowId });
    const stripeCh = stripeTriggerChannel({ workflowId });
    const geminiCh = geminiChannel({ workflowId });
    const openAiCh = OpenAIChannel({ workflowId });
    const anthropicCh = AnthropicChannel({ workflowId });
    const discordCh = discordChannel({ workflowId });
    const slackCh = SlackChannel({ workflowId });
    const emailCh = emailTriggerChannel({ workflowId });
    const conditionCh = conditionChannel({ workflowId });
    const whatsappCh = whatsappChannel({ workflowId });

    const { sortedNodes, connections } = await step.run(
      "prepare-workflow",
      async () => {
        const workflow = await prisma.workflows.findUniqueOrThrow({
          where: { id: workflowId },
          include: {
            nodes: true,
            connections: true,
          },
        });
        return {
          sortedNodes: topologicalSort(workflow.nodes, workflow.connections),
          connections: workflow.connections.map((connection) => ({
            fromNodeId: connection.fromNodeId,
            toNodeId: connection.toNodeId,
            fromOutput: connection.fromOutput,
          })),
        };
      },
    );

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflows.findFirstOrThrow({
        where: { id: workflowId },
        select: { userId: true },
      });
      return workflow.userId;
    });

    let context = event.data.initialData || {};
    const skippedNodeIds = new Set<string>();

    for (const node of sortedNodes) {
      if (
        isNodeSkipped(
          node.id,
          connections,
          getBranchDecisions(context),
          skippedNodeIds,
        )
      ) {
        skippedNodeIds.add(node.id);
        continue;
      }

      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        userId,
        nodeId: node.id,
        context,
        step,
        httpCh,
        manualCh,
        googleFormCh,
        stripeCh,
        geminiCh,
        openAiCh,
        anthropicCh,
        discordCh,
        slackCh,
        emailCh,
        conditionCh,
        whatsappCh,
      });
    }

    context = stripBranchDecisions(context);

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        },
      });
    });

    return {
      workflowId,
      result: context,
    };
  },
);
