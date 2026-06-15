import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { NodeExecutor } from "@/features/executions/types";
import { generateText } from "ai";
Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type GeminiData = {
  variableName?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

export const GeminiExecutor: NodeExecutor<GeminiData> = async ({
  data,
  nodeId,
  context,
  step,
  geminiCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, geminiCh.status, {
    nodeId,
    status: "loading",
  });

  if (!data.variableName) {
    await step.realtime.publish(`${nodeId}-error`, geminiCh.status, {
      nodeId,
      status: "error",
    });
    throw new NonRetriableError("Gemini node: Variable name is missing");
  }

  if (!data.userPrompt) {
    await step.realtime.publish(`${nodeId}-error`, geminiCh.status, {
      nodeId,
      status: "error",
    });
    throw new NonRetriableError("Gemini node: User prompt is missing");
  }

  // TODO: Throw if credential is missing

  const credentialValue = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "You are a helpful assistant.";
  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  const google = createGoogleGenerativeAI({
    apiKey: credentialValue,
  });

  try {
    const { steps } = await step.ai.wrap("gemini-generate-text", generateText, {
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });
    const text =
      steps[0].content[0].type === "text" ? steps[0].content[0].text : "";

    await step.realtime.publish(`${nodeId}-success`, geminiCh.status, {
      nodeId,
      status: "success",
    });

    return {
      ...context,
      [data.variableName]: {
        text,
      },
    };
  } catch (error) {
    await step.realtime.publish(`${nodeId}-error`, geminiCh.status, {
      nodeId,
      status: "error",
    });
    throw error;
  }
};
