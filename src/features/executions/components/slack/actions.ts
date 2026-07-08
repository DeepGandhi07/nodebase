"use server";

import { SlackChannel } from "@/inngest/channels/slack";
import { inngest } from "@/inngest/client";
import { getClientSubscriptionToken } from "inngest/react";

export async function fetchSlackRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: SlackChannel({ workflowId }),
    topics: ["status"],
  });
}
