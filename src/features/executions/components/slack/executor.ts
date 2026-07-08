import type { NodeExecutor } from "@/features/executions/types";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type SlackData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
  username?: string;
};

export const SlackExecutor: NodeExecutor<SlackData> = async ({
  data,
  nodeId,
  context,
  step,
  slackCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, slackCh.status, {
    nodeId,
    status: "loading",
  });

  if (!data.content) {
    await step.realtime.publish(`${nodeId}-error`, slackCh.status, {
      nodeId,
      status: "error",
    });
    throw new NonRetriableError("Slack node: Message content is required");
  }

  const rawContent = Handlebars.compile(data.content)(context);
  const content = decode(rawContent);

  try {
    const result = await step.run("slack-webhook", async () => {
      if (!data.webhookUrl) {
        await step.realtime.publish(`${nodeId}-error`, slackCh.status, {
          nodeId,
          status: "error",
        });
        throw new NonRetriableError("Slack node: Webhook URL is required");
      }
      await ky.post(data.webhookUrl, {
        json: {
          content: content,
        },
      });
      if (!data.variableName) {
        await step.realtime.publish(`${nodeId}-error`, slackCh.status, {
          nodeId,
          status: "error",
        });
        throw new NonRetriableError("Slack Node: Variable name is missing");
      }

      return {
        ...context,
        [data.variableName]: {
          messageContent: content.slice(0, 2000),
        },
      };
    });
    await step.realtime.publish(`${nodeId}-success`, slackCh.status, {
      nodeId,
      status: "success",
    });

    return result;
  } catch (error) {
    await step.realtime.publish(`${nodeId}-error`, slackCh.status, {
      nodeId,
      status: "error",
    });
    throw error;
  }
};
