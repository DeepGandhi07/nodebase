import { realtime } from "inngest";
import { z } from "zod";

export const OpenAIChannel = realtime.channel({
  name: ({ workflowId }: { workflowId: string }) =>
    `open-ai-execution:${workflowId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
