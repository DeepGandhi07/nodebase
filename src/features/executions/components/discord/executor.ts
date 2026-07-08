import type { NodeExecutor } from "@/features/executions/types";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type DiscordData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
  username?: string;
};

export const DiscordExecutor: NodeExecutor<DiscordData> = async ({
  data,
  nodeId,
  context,
  step,
  discordCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, discordCh.status, {
    nodeId,
    status: "loading",
  });

  if (!data.content) {
    await step.realtime.publish(`${nodeId}-error`, discordCh.status, {
      nodeId,
      status: "error",
    });
    throw new NonRetriableError("Discord node: Message content is required");
  }

  const rawContent = Handlebars.compile(data.content)(context);
  const content = decode(rawContent);
  const username = data.username
    ? decode(Handlebars.compile(data.username)(context))
    : undefined;

  try {
    const result = await step.run("discord-webhook", async () => {
      if (!data.webhookUrl) {
        await step.realtime.publish(`${nodeId}-error`, discordCh.status, {
          nodeId,
          status: "error",
        });
        throw new NonRetriableError("Discord node: Webhook URL is required");
      }
      await ky.post(data.webhookUrl, {
        json: {
          content: content.slice(0, 2000), // Discord's max message length
          username,
        },
      });
      if (!data.variableName) {
        await step.realtime.publish(`${nodeId}-error`, discordCh.status, {
          nodeId,
          status: "error",
        });
        throw new NonRetriableError("Discord Node: Variable name is missing");
      }

      return {
        ...context,
        [data.variableName]: {
          messageContent: content.slice(0, 2000),
        },
      };
    });
    await step.realtime.publish(`${nodeId}-success`, discordCh.status, {
      nodeId,
      status: "success",
    });

    return result;
  } catch (error) {
    await step.realtime.publish(`${nodeId}-error`, discordCh.status, {
      nodeId,
      status: "error",
    });
    throw error;
  }
};
