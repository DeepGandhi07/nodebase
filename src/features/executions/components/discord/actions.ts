"use server";

import { discordChannel } from "@/inngest/channels/discord";
import { inngest } from "@/inngest/client";
import { getClientSubscriptionToken } from "inngest/react";

export async function fetchDiscordRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: discordChannel({ workflowId }),
    topics: ["status"],
  });
}
