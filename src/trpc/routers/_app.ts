import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "../init";
import { inngest } from "@/inngest/client";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const appRouter = createTRPCRouter({
  testAi: protectedProcedure.mutation(async () => {
    await inngest.send({
      name: "execute/ai",
    });
    return { success: true, message: "AI Executed" };
  }),
  getWorkflows: protectedProcedure.query(({ ctx }) => {
    return prisma.workflows.findMany();
  }),
  createWorkflow: protectedProcedure.mutation(async () => {
    await inngest.send({
      name: "app/task.created",
      data: { email: "deep@gmail.com" },
    });
    return { success: true, message: "Workflow queued" };
  }),
});
// export type definition of API
export type AppRouter = typeof appRouter;
