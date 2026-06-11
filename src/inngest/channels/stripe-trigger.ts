import { realtime } from "inngest";
import { z } from "zod";

export const stripeTriggerChannel = realtime.channel({
  name: ({ workflowId }: { workflowId: string }) =>
    `stripe-execution:${workflowId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
