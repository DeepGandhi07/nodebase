import { AnthropicChannel } from "@/inngest/channels/anthropic";
import { discordChannel } from "@/inngest/channels/discord";
import { geminiChannel } from "@/inngest/channels/gemini";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";
import type { httpRequestChannel } from "@/inngest/channels/http-request";
import type { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import { OpenAIChannel } from "@/inngest/channels/open-ai";
import { SlackChannel } from "@/inngest/channels/slack";
import { stripeTriggerChannel } from "@/inngest/channels/stripe-trigger";

type ChannelInstance<T extends (...args: any) => any> = ReturnType<T>;
export type WorkflowContext = Record<string, unknown>;

export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  userId: string;
  context: Record<string, unknown>;
  step: any;
  httpCh: ChannelInstance<typeof httpRequestChannel>;
  manualCh: ChannelInstance<typeof manualTriggerChannel>;
  googleFormCh: ChannelInstance<typeof googleFormTriggerChannel>;
  stripeCh: ChannelInstance<typeof stripeTriggerChannel>;
  geminiCh: ChannelInstance<typeof geminiChannel>;
  openAiCh: ChannelInstance<typeof OpenAIChannel>;
  anthropicCh: ChannelInstance<typeof AnthropicChannel>;
  discordCh: ChannelInstance<typeof discordChannel>;
  slackCh: ChannelInstance<typeof SlackChannel>;
}

export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>;
