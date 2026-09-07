"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { conditionChannel } from "@/inngest/channels/condition";
import { inngest } from "@/inngest/client";

export async function fetchConditionRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: conditionChannel({ workflowId }),
    topics: ["status"],
  });
}
