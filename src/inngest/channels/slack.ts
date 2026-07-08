import { realtime } from "inngest";
import { z } from "zod";

export const SlackChannel = realtime.channel({
  name: ({ workflowId }: { workflowId: string }) =>
    `slack-execution:${workflowId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
