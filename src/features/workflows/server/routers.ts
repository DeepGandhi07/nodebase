import prisma from "@/lib/db";
import { generateSlug } from "random-word-slugs";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { NodeType, Prisma } from "@/generated/prisma/client";
import { Node, Edge } from "@xyflow/react";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { CredentialType } from "@/generated/prisma/enums";
import { decrypt } from "@/lib/encryption";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { TRPCError } from "@trpc/server";
import {
  generatedWorkflowSchema,
  toWorkflowLayout,
  WORKFLOW_GENERATION_SYSTEM_PROMPT,
} from "../lib/workflow-generation";

const CREDENTIAL_TYPE_BY_NODE_TYPE: Partial<Record<NodeType, CredentialType>> =
  {
    [NodeType.OPENAI]: CredentialType.OPENAI,
    [NodeType.ANTHROPIC]: CredentialType.ANTHROPIC,
    [NodeType.GEMINI]: CredentialType.GEMINI,
    [NodeType.WHATSAPP]: CredentialType.WHATSAPP,
    [NodeType.EMAIL_TRIGGER]: CredentialType.EMAIL,
  };

const GENERATION_MODELS = [
  {
    type: CredentialType.OPENAI,
    model: (apiKey: string) => createOpenAI({ apiKey })("gpt-4o-mini"),
  },
  {
    type: CredentialType.ANTHROPIC,
    model: (apiKey: string) =>
      createAnthropic({ apiKey })("claude-3-5-sonnet-latest"),
  },
  {
    type: CredentialType.GEMINI,
    model: (apiKey: string) =>
      createGoogleGenerativeAI({ apiKey })("gemini-2.0-flash"),
  },
];

export const workflowsRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string(), correlationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workflow = await prisma.workflows.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.auth.user.id },
      });

      const result = await sendWorkflowExecution({
        workflowId: input.id,
        correlationId: input.correlationId,
      });

      return { workflow, runId: result.ids[0] };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        prompt: z.string().min(1, "Describe the workflow you want"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;

      await prisma.workflows.findUniqueOrThrow({
        where: { id: input.id, userId },
      });

      const credentials = await prisma.credential.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });

      const credentialByType = new Map(
        credentials.map((credential) => [credential.type, credential]),
      );

      const generationProvider = GENERATION_MODELS.find((provider) =>
        credentialByType.has(provider.type),
      );

      if (!generationProvider) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Add an OpenAI, Anthropic or Gemini credential before generating a workflow.",
        });
      }

      const apiKey = decrypt(
        credentialByType.get(generationProvider.type)!.value,
      );

      const { object } = await generateObject({
        model: generationProvider.model(apiKey),
        schema: generatedWorkflowSchema,
        system: WORKFLOW_GENERATION_SYSTEM_PROMPT,
        prompt: input.prompt,
      });

      const credentialIdByType: Partial<Record<NodeType, string>> = {};
      for (const [nodeType, credentialType] of Object.entries(
        CREDENTIAL_TYPE_BY_NODE_TYPE,
      )) {
        const credential = credentialByType.get(credentialType);
        if (credential) {
          credentialIdByType[nodeType as NodeType] = credential.id;
        }
      }

      const layout = toWorkflowLayout(object, credentialIdByType);

      await prisma.$transaction(async (tx) => {
        await tx.node.deleteMany({ where: { workflowId: input.id } });

        await tx.node.createMany({
          data: layout.nodes.map((node) => ({
            id: node.id,
            workflowId: input.id,
            name: node.type,
            type: node.type,
            position: node.position,
            data: node.data as Prisma.InputJsonValue,
          })),
        });

        await tx.connection.createMany({
          data: layout.edges.map((edge) => ({
            workflowId: input.id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle,
            toInput: edge.targetHandle,
          })),
        });

        await tx.workflows.update({
          where: { id: input.id },
          data: { updatedAt: new Date() },
        });
      });

      const nodes: Node[] = layout.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      }));

      const edges: Edge[] = layout.edges.map((edge) => ({
        id: `${edge.source}-${edge.target}-${edge.sourceHandle}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      }));

      return { nodes, edges };
    }),

  create: premiumProcedure.mutation(({ ctx }) => {
    return prisma.workflows.create({
      data: {
        name: generateSlug(3),
        userId: ctx.auth.user.id,
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        },
      },
    });
  }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return prisma.workflows.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.string().nullish(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: z.record(z.string(), z.any()).optional(),
          }),
        ),
        edges: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;

      const workflow = await prisma.workflows.findUniqueOrThrow({
        where: { id, userId: ctx.auth.user.id },
      });

      // Transaction to ensure consistency
      return await prisma.$transaction(async (tx) => {
        // Delete existing nodes and connections (cascade deletes connections)
        await tx.node.deleteMany({
          where: { workflowId: id },
        });

        // Create nodes
        await tx.node.createMany({
          data: nodes.map((node) => ({
            id: node.id,
            workflowId: id,
            name: node.type || "unknown",
            type: node.type as NodeType,
            position: node.position,
            data: node.data || {},
          })),
        });

        // Create connections
        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });

        // Update workflow's updateAt timestamp
        await tx.workflows.update({
          where: { id },
          data: { updatedAt: new Date() },
        });

        return workflow;
      });
    }),

  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return prisma.workflows.update({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        data: {
          name: input.name,
        },
      });
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await prisma.workflows.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        include: {
          nodes: true,
          connections: true,
        },
      });

      // Transform server nodes to react-flow compatible nodes
      const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number; y: number },
        data: (node.data as Record<string, unknown>) || {},
      }));

      // Transform server connections to react-flow compatible edges
      const edges: Edge[] = workflow.connections.map((connection) => ({
        id: connection.id,
        source: connection.fromNodeId,
        target: connection.toNodeId,
        sourceHandle: connection.fromOutput,
        targetHandle: connection.toInput,
      }));

      return {
        id: workflow.id,
        name: workflow.name,
        nodes,
        edges,
      };
    }),

  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.workflows.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.auth.user.id,
            name: { contains: search, mode: "insensitive" },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.workflows.count({
          where: {
            userId: ctx.auth.user.id,
            name: { contains: search, mode: "insensitive" },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
});
