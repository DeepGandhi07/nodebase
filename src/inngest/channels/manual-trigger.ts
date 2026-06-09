import { realtime } from "inngest";
import { z } from "zod";

export const manualTriggerChannel = realtime.channel({
  name: ({ correlationId }: { correlationId: string }) =>
    `manual-trigger-execution:${correlationId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
