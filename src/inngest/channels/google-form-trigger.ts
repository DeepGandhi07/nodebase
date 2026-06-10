import { realtime } from "inngest";
import { z } from "zod";

export const googleFormTriggerChannel = realtime.channel({
  name: ({ correlationId }: { correlationId: string }) =>
    `google-form-execution:${correlationId}`,
  topics: {
    status: {
      schema: z.object({
        nodeId: z.string(),
        status: z.enum(["loading", "success", "error"]),
      }),
    },
  },
});
