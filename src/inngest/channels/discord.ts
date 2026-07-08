import { realtime } from "inngest";
import { z } from "zod";

export const discordChannel = realtime.channel({
  name: ({ workflowId }: { workflowId: string }) =>
    `discord-execution:${workflowId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
