import type { NodeExecutor } from "@/features/executions/types";

type ManualTriggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTriggerData> = async ({
  nodeId,
  context,
  step,
  manualCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, manualCh.status, {
    nodeId,
    status: "loading",
  });

  const result = await step.run(
    `manual-trigger-${nodeId}`,
    async () => context,
  );

  await step.realtime.publish(`${nodeId}-success`, manualCh.status, {
    nodeId,
    status: "success",
  });

  return result;
};
