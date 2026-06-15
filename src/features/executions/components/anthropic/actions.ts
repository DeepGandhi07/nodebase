"use server";

import { AnthropicChannel } from "@/inngest/channels/anthropic";
import { inngest } from "@/inngest/client";
import { getClientSubscriptionToken } from "inngest/react";

export async function fetchAnthropicRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: AnthropicChannel({ workflowId }),
    topics: ["status"],
  });
}
