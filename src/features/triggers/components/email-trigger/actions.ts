"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { emailTriggerChannel } from "@/inngest/channels/email-trigger";
import { inngest } from "@/inngest/client";

export async function fetchEmailTriggerRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: emailTriggerChannel({ workflowId }),
    topics: ["status"],
  });
}
