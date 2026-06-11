import type { NodeExecutor } from "@/features/executions/types";

type StripeTriggerData = Record<string, unknown>;

export const StripeTriggerExecutor: NodeExecutor<StripeTriggerData> = async ({
  nodeId,
  context,
  step,
  stripeCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, stripeCh.status, {
    nodeId,
    status: "loading",
  });

  const result = await step.run(
    `stripe-trigger-${nodeId}`,
    async () => context,
  );

  await step.realtime.publish(`${nodeId}-success`, stripeCh.status, {
    nodeId,
    status: "success",
  });

  return result;
};
