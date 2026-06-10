import { realtime } from "inngest";
import { z } from "zod";

export const googleFormTriggerChannel = realtime.channel({
  name: ({ workflowId }: { workflowId: string }) =>
    `google-form-execution:${workflowId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
