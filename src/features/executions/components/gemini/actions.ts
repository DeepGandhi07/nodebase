"use server";

import { geminiChannel } from "@/inngest/channels/gemini";
import { inngest } from "@/inngest/client";
import { getClientSubscriptionToken } from "inngest/react";

export async function fetchGeminiRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: geminiChannel({ workflowId }),
    topics: ["status"],
  });
}
