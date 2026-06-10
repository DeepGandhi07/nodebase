"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { inngest } from "@/inngest/client";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";

export async function fetchGoogleFormTriggerRealtimeToken(
  correlationId: string,
) {
  return getClientSubscriptionToken(inngest, {
    channel: googleFormTriggerChannel({ correlationId }),
    topics: ["status"],
  });
}
