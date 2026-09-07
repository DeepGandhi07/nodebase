import { realtime } from "inngest";
import { z } from "zod";

export const conditionChannel = realtime.channel({
  name: ({ workflowId }: { workflowId: string }) =>
    `condition-execution:${workflowId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
