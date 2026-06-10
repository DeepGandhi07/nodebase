import type { NodeExecutor } from "@/features/executions/types";

type GoogleFormTriggerData = Record<string, unknown>;

export const GoogleFormTriggerExecutor: NodeExecutor<
  GoogleFormTriggerData
> = async ({ nodeId, context, step, googleFormCh }) => {
  console.log(
    "[GoogleFormTriggerExecutor] channel name:",
    (googleFormCh as any).name,
  );

  await step.realtime.publish(`${nodeId}-loading`, googleFormCh.status, {
    nodeId,
    status: "loading",
  });

  const result = await step.run(
    `google-form-trigger-${nodeId}`,
    async () => context,
  );

  await step.realtime.publish(`${nodeId}-success`, googleFormCh.status, {
    nodeId,
    status: "success",
  });

  return result;
};
