import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import type { NodeExecutor } from "@/features/executions/types";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type HttpRequestData = {
  variableName: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
};

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({
  data,
  nodeId,
  context,
  step,
  httpCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, httpCh.status, {
    nodeId,
    status: "loading",
  });

  if (!data.endpoint) {
    await step.realtime.publish(`${nodeId}-error`, httpCh.status, {
      nodeId,
      status: "error",
    });
    throw new NonRetriableError("HTTP Request node: No endpoint configured");
  }

  if (!data.variableName) {
    await step.realtime.publish(`${nodeId}-error`, httpCh.status, {
      nodeId,
      status: "error",
    });
    throw new NonRetriableError(
      "HTTP Request node: Variable name not configured",
    );
  }

  if (!data.method) {
    await step.realtime.publish(`${nodeId}-error`, httpCh.status, {
      nodeId,
      status: "error",
    });
    throw new NonRetriableError("HTTP Request node: Method not configured");
  }

  const result = await step.run(`http-request-${nodeId}`, async () => {
    const endpoint = Handlebars.compile(data.endpoint)(context);
    const method = data.method;

    const options: KyOptions = { method };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      const resolved = Handlebars.compile(data.body || "{}")(context);
      console.log("BODYYYYYYYY", resolved);
      JSON.parse(resolved);
      options.body = resolved;
      options.headers = {
        "Content-Type": "application/json",
      };
    }

    const response = await ky(endpoint, options);
    const contentType = response.headers.get("content-type");
    const responseData = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      ...context,
      [data.variableName]: {
        httpResponse: {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        },
      },
    };
  });

  await step.realtime.publish(`${nodeId}-success`, httpCh.status, {
    nodeId,
    status: "success",
  });

  return result;
};
