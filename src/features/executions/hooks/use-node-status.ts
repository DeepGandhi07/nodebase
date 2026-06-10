import { useRealtime } from "inngest/react";
import { useEffect, useState } from "react";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";
import type { httpRequestChannel } from "@/inngest/channels/http-request";
import type { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import type { getClientSubscriptionToken } from "inngest/react";
import type { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";

type AnyChannel =
  | ReturnType<typeof httpRequestChannel>
  | ReturnType<typeof manualTriggerChannel>
  | ReturnType<typeof googleFormTriggerChannel>;

interface UseNodeStatusOptions {
  nodeId: string;
  channel: AnyChannel | null;
  refreshToken: () => Promise<
    Awaited<ReturnType<typeof getClientSubscriptionToken>>
  >;
}

export function useNodeStatus({
  nodeId,
  channel,
  refreshToken,
}: UseNodeStatusOptions) {
  const [status, setStatus] = useState<NodeStatus>("initial");

  const topics = ["status"] as const;

  const { messages, connectionStatus, error } = useRealtime({
    channel: channel!,
    topics,
    token: refreshToken,
    enabled: !!channel,
  });

  useEffect(() => {
    console.log("[useNodeStatus]", {
      nodeId,
      channelName: (channel as any)?.name,
      connectionStatus,
      error,
      messagesCount: messages.all?.length,
      byTopic: messages.byTopic.status,
    });
  }, [connectionStatus, messages.all?.length, error]);

  useEffect(() => {
    if (!messages.all?.length) return;

    const latestMessage = [...messages.all]
      .filter(
        (msg) =>
          msg.kind === "data" &&
          msg.topic === "status" &&
          msg.data.nodeId === nodeId,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

    if (latestMessage?.kind === "data") {
      setStatus(latestMessage.data.status as NodeStatus);
    }
  }, [messages.all?.length, nodeId]);

  return status;
}
