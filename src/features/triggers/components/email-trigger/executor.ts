import { parseEmailCredential } from "@/features/credentials/lib/secret-values";
import { withBranchDecision } from "@/features/executions/lib/branching";
import type { NodeExecutor } from "@/features/executions/types";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import type { NormalizedEmail } from "./normalize";

type EmailTriggerData = {
  credentialId?: string;
  fromFilter?: string;
  subjectFilter?: string;
};

const matchesFilter = (value: string, filter?: string) => {
  if (!filter?.trim()) return true;

  return filter
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => value.toLowerCase().includes(entry));
};

export const EmailTriggerExecutor: NodeExecutor<EmailTriggerData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  emailCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, emailCh.status, {
    nodeId,
    status: "loading",
  });

  const email = context.email as NormalizedEmail | undefined;

  const inboxAddress = data.credentialId
    ? await step.run("get-email-credential", async () => {
        const credential = await prisma.credential.findUnique({
          where: { id: data.credentialId, userId },
        });

        return credential
          ? parseEmailCredential(decrypt(credential.value)).address
          : null;
      })
    : null;

  const matches =
    !!email &&
    matchesFilter(email.from, data.fromFilter) &&
    matchesFilter(email.subject, data.subjectFilter) &&
    (!inboxAddress || email.to.toLowerCase() === inboxAddress.toLowerCase());

  await step.realtime.publish(`${nodeId}-success`, emailCh.status, {
    nodeId,
    status: "success",
  });

  // A non-matching email is not a failure: the run simply stops here.
  return matches ? context : withBranchDecision(context, nodeId, []);
};
