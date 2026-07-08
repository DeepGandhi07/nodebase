import { GoogleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { StripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { NodeType } from "@/generated/prisma/enums";
import { httpRequestExecutor } from "../components/http-request/executor";
import { NodeExecutor, NodeExecutorParams, WorkflowContext } from "../types";
import { GeminiExecutor } from "../components/gemini/executor";
import { OpenAiExecutor } from "../components/openai/executor";
import { AnthropicExecutor } from "../components/anthropic/executor";
import { DiscordExecutor } from "../components/discord/executor";
import { SlackExecutor } from "../components/slack/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerExecutor,
  [NodeType.GEMINI]: GeminiExecutor,
  [NodeType.OPENAI]: OpenAiExecutor,
  [NodeType.ANTHROPIC]: AnthropicExecutor,
  [NodeType.DISCORD]: DiscordExecutor,
  [NodeType.SLACK]: SlackExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
