import prisma from "@/lib/db";
import { inngest } from "./client";

export const processTask = inngest.createFunction(
  { id: "process-task", triggers: { event: "app/task.created" } },
  async ({ event, step }) => {
    // Fetching the Video
    await step.sleep("Fetching", "5s");

    // Transcribing the Video
    await step.sleep("Transcribing", "5s");

    // Sending Transcription to openAI
    await step.sleep("Sending to openAI", "5s");

    await step.run("Create Task", async () => {
      return prisma.workflows.create({
        data: {
          name: `Workflow from Inngest - ${event.data.email}`,
        },
      });
    });

    return { message: `Task ${event.data.email} complete` };
  },
);
