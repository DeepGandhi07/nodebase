import prisma from "@/lib/db";
import { baseProcedure, createTRPCRouter } from "../init";
export const appRouter = createTRPCRouter({
  getUsers: baseProcedure.query((opts) => {
    return prisma.user.findMany();
  }),
});
// export type definition of API
export type AppRouter = typeof appRouter;
