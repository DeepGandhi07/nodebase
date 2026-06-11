import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";
import type { httpRequestChannel } from "@/inngest/channels/http-request";
import type { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import { stripeTriggerChannel } from "@/inngest/channels/stripe-trigger";

type ChannelInstance<T extends (...args: any) => any> = ReturnType<T>;
export type WorkflowContext = Record<string, unknown>;

export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  context: Record<string, unknown>;
  step: any;
  httpCh: ChannelInstance<typeof httpRequestChannel>;
  manualCh: ChannelInstance<typeof manualTriggerChannel>;
  googleFormCh: ChannelInstance<typeof googleFormTriggerChannel>;
  stripeCh: ChannelInstance<typeof stripeTriggerChannel>;
}

export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>;
