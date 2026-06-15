"use server";

import { OpenAIChannel } from "@/inngest/channels/open-ai";
import { inngest } from "@/inngest/client";
import { getClientSubscriptionToken } from "inngest/react";

export async function fetchOpenAiRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: OpenAIChannel({ workflowId }),
    topics: ["status"],
  });
}
