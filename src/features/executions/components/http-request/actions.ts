"use server";

import { getClientSubscriptionToken } from "inngest/react";
import { inngest } from "@/inngest/client";
import { httpRequestChannel } from "@/inngest/channels/http-request";

export async function fetchHttpRequestRealtimeToken(correlationId: string) {
  return getClientSubscriptionToken(inngest, {
    channel: httpRequestChannel({ correlationId }),
    topics: ["status"],
  });
}
