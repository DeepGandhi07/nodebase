"use server";

import { stripeTriggerChannel } from "@/inngest/channels/stripe-trigger";
import { inngest } from "@/inngest/client";
import { getClientSubscriptionToken } from "inngest/react";

export async function fetchStripeTriggerRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: stripeTriggerChannel({ workflowId }),
    topics: ["status"],
  });
}
