import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";
import type { httpRequestChannel } from "@/inngest/channels/http-request";
import type { manualTriggerChannel } from "@/inngest/channels/manual-trigger";

type ChannelInstance<T extends (...args: any) => any> = ReturnType<T>;

export type NodeExecutorParams<TData> = {
  data: TData;
  nodeId: string;
  context: Record<string, unknown>;
  step: any;
  httpCh: ChannelInstance<typeof httpRequestChannel>;
  manualCh: ChannelInstance<typeof manualTriggerChannel>;
  googleFormCh: ChannelInstance<typeof googleFormTriggerChannel>;
};

export type NodeExecutor<TData> = (
  params: NodeExecutorParams<TData>,
) => Promise<Record<string, unknown>>;
