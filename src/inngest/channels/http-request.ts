import { realtime } from "inngest";
import { z } from "zod";

export const httpRequestChannel = realtime.channel({
  name: ({ correlationId }: { correlationId: string }) =>
    `http-request-execution:${correlationId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
