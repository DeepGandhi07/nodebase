import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
import {
  normalizePhoneNumber,
  parseWhatsappCredential,
  type WhatsappCredential,
} from "@/features/credentials/lib/secret-values";
import type { NodeExecutor } from "@/features/executions/types";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

const META_GRAPH_VERSION = "v21.0";

type WhatsappData = {
  variableName?: string;
  credentialId?: string;
  to?: string;
  content?: string;
  templateName?: string;
  templateLanguage?: string;
};

const sendViaTwilio = async (
  credential: Extract<WhatsappCredential, { provider: "twilio" }>,
  to: string,
  body: string,
) => {
  const auth = Buffer.from(
    `${credential.accountSid}:${credential.authToken}`,
  ).toString("base64");

  return ky
    .post(
      `https://api.twilio.com/2010-04-01/Accounts/${credential.accountSid}/Messages.json`,
      {
        headers: { Authorization: `Basic ${auth}` },
        body: new URLSearchParams({
          From: `whatsapp:${normalizePhoneNumber(credential.fromNumber)}`,
          To: `whatsapp:${to}`,
          Body: body,
        }),
      },
    )
    .json<{ sid: string; status: string }>();
};

const sendViaMeta = async (
  credential: Extract<WhatsappCredential, { provider: "meta" }>,
  to: string,
  body: string,
  template?: { name: string; language: string },
) => {
  // Outside the 24h customer-service window Meta only delivers approved
  // templates, so the node falls back to one when it is configured.
  const payload = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: body }],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body },
      };

  return ky
    .post(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${credential.phoneNumberId}/messages`,
      {
        headers: { Authorization: `Bearer ${credential.accessToken}` },
        json: payload,
      },
    )
    .json<{ messages: { id: string }[] }>();
};

export const WhatsappExecutor: NodeExecutor<WhatsappData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  whatsappCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, whatsappCh.status, {
    nodeId,
    status: "loading",
  });

  try {
    if (!data.variableName) {
      throw new NonRetriableError("WhatsApp node: Variable name is missing");
    }

    if (!data.content) {
      throw new NonRetriableError("WhatsApp node: Message content is required");
    }

    if (!data.credentialId) {
      throw new NonRetriableError("WhatsApp node: Credential is missing");
    }

    const credentialRecord = await step.run("get-credential", () =>
      prisma.credential.findUnique({
        where: { id: data.credentialId, userId },
      }),
    );

    if (!credentialRecord) {
      throw new NonRetriableError("WhatsApp node: Credential not found");
    }

    const credential = parseWhatsappCredential(decrypt(credentialRecord.value));

    const body = decode(Handlebars.compile(data.content)(context)).slice(
      0,
      4096,
    );
    const to = normalizePhoneNumber(
      data.to ? Handlebars.compile(data.to)(context) : credential.defaultTo,
    );

    const response = await step.run("whatsapp-send", async () => {
      if (credential.provider === "twilio") {
        const result = await sendViaTwilio(credential, to, body);
        return { messageId: result.sid, status: result.status };
      }

      const result = await sendViaMeta(
        credential,
        to,
        body,
        data.templateName
          ? {
              name: data.templateName,
              language: data.templateLanguage || "en_US",
            }
          : undefined,
      );
      return { messageId: result.messages?.[0]?.id ?? "", status: "sent" };
    });

    await step.realtime.publish(`${nodeId}-success`, whatsappCh.status, {
      nodeId,
      status: "success",
    });

    return {
      ...context,
      [data.variableName]: {
        to,
        text: body,
        provider: credential.provider,
        ...response,
      },
    };
  } catch (error) {
    await step.realtime.publish(`${nodeId}-error`, whatsappCh.status, {
      nodeId,
      status: "error",
    });
    throw error;
  }
};
