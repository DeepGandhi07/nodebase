"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { inngest } from "@/inngest/client";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";

export async function fetchManualTriggerRealtimeToken(correlationId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: manualTriggerChannel({ correlationId }),
    topics: ["status"],
  });
}
