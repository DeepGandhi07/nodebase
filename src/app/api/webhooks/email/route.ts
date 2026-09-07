import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { normalizeInboundEmail } from "@/features/triggers/components/email-trigger/normalize";
import { sendWorkflowExecution } from "@/inngest/utils";

const readPayload = async (request: NextRequest): Promise<unknown> => {
  const contentType = request.headers.get("content-type") ?? "";

  // SendGrid Inbound Parse posts multipart/form-data instead of JSON.
  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData();
    return Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [
        key,
        typeof value === "string" ? value : value.name,
      ]),
    );
  }

  return request.json();
};

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");
    const secret = url.searchParams.get("secret");

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required query parameter: workflowId",
        },
        { status: 400 },
      );
    }

    const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook secret" },
        { status: 401 },
      );
    }

    const email = normalizeInboundEmail(await readPayload(request));

    if (!email.from && !email.subject && !email.text) {
      return NextResponse.json(
        { success: false, error: "Unrecognized inbound email payload" },
        { status: 422 },
      );
    }

    await sendWorkflowExecution({
      workflowId,
      correlationId: randomUUID(),
      initialData: { email },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process inbound email" },
      { status: 500 },
    );
  }
}
