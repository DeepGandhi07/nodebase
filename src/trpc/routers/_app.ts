import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "../init";

export const appRouter = createTRPCRouter({
  testAi: protectedProcedure.mutation(async () => {
    await inngest.send({
      name: "execute/ai",
    });
    return { success: true, message: "AI Executed" };
  }),
  getWorkflows: premiumProcedure.query(({ ctx }) => {
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
