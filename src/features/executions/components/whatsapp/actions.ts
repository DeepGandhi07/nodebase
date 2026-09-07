"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import { inngest } from "@/inngest/client";

export async function fetchWhatsappRealtimeToken(workflowId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: whatsappChannel({ workflowId }),
    topics: ["status"],
  });
}
