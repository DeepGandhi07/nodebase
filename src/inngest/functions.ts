import { generateText } from "ai";
import { inngest } from "./client";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const google = createGoogleGenerativeAI();
const openai = createOpenAI();
const anthropic = createAnthropic();

export const execute = inngest.createFunction(
  { id: "execute-ai", triggers: { event: "execute/ai" } },

  async ({ event, step }) => {
    await step.sleep("pretend", "5s");
    const { steps: GeminiSteps } = await step.ai.wrap(
      "gemini-generate-text",
      generateText,
      {
        system: "You are a helpful assistant for generating text.",
        prompt: "What is 2+2?",
        model: google("gemini-2.5-flash"),
      },
    );

    const { steps: openaiSteps } = await step.ai.wrap(
      "openai-generate-text",
      generateText,
      {
        system: "You are a helpful assistant for generating text.",
        prompt: "What is 2+2?",
        model: openai("gpt-4.1"),
      },
    );

    const { steps: anthropicSteps } = await step.ai.wrap(
      "anthropic-generate-text",
      generateText,
      {
        system: "You are a helpful assistant for generating text.",
        prompt: "What is 2+2?",
        model: anthropic("claude-sonnet-4-5"),
      },
    );
    return { GeminiSteps, openaiSteps, anthropicSteps };
  },
);
