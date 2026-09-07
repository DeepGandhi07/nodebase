import { realtime } from "inngest";
import { z } from "zod";

export const whatsappChannel = realtime.channel({
  name: ({ workflowId }: { workflowId: string }) =>
    `whatsapp-execution:${workflowId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
