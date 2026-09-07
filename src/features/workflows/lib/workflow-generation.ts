import { createId } from "@paralleldrive/cuid2";
import z from "zod";
import { FALSE_HANDLE, TRUE_HANDLE } from "@/features/executions/lib/branching";
import { NodeType } from "@/generated/prisma/enums";

/**
 * Shape the model has to produce. Keys are model-authored placeholders that get
 * swapped for real cuids once the workflow is persisted.
 */
export const generatedNodeSchema = z.object({
  key: z.string().min(1),
  type: z.enum([
    NodeType.MANUAL_TRIGGER,
    NodeType.EMAIL_TRIGGER,
    NodeType.GOOGLE_FORM_TRIGGER,
    NodeType.STRIPE_TRIGGER,
    NodeType.HTTP_REQUEST,
    NodeType.OPENAI,
    NodeType.ANTHROPIC,
    NodeType.GEMINI,
    NodeType.CONDITION,
    NodeType.DISCORD,
    NodeType.SLACK,
    NodeType.WHATSAPP,
  ]),
  variableName: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  content: z.string().optional(),
  leftValue: z.string().optional(),
  operator: z.string().optional(),
  rightValue: z.string().optional(),
  fromFilter: z.string().optional(),
  subjectFilter: z.string().optional(),
  url: z.string().optional(),
  method: z.string().optional(),
});

export const generatedEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  branch: z.enum(["true", "false"]).optional(),
});

export const generatedWorkflowSchema = z.object({
  name: z.string().optional(),
  nodes: z.array(generatedNodeSchema).min(1),
  edges: z.array(generatedEdgeSchema),
});

export type GeneratedWorkflow = z.infer<typeof generatedWorkflowSchema>;
export type GeneratedNode = z.infer<typeof generatedNodeSchema>;

export const WORKFLOW_GENERATION_SYSTEM_PROMPT = `You design automation workflows for Nodebase, a node based workflow builder.
Return a workflow made of the supported nodes only.

Supported nodes and their fields:
- MANUAL_TRIGGER: starts the flow from a button. No fields.
- EMAIL_TRIGGER: starts the flow when an email arrives. Optional "fromFilter" and "subjectFilter" (comma separated substrings). Exposes {{email.from}}, {{email.subject}}, {{email.text}}.
- GOOGLE_FORM_TRIGGER / STRIPE_TRIGGER: webhook triggers, no fields.
- HTTP_REQUEST: "variableName", "url", "method".
- OPENAI / ANTHROPIC / GEMINI: AI text generation. "variableName", "systemPrompt", "userPrompt". Output is available as {{variableName.text}}.
- CONDITION: branches the flow. "variableName", "leftValue" (a handlebars expression), "operator" (one of equals, notEquals, contains, notContains, startsWith, endsWith, greaterThan, lessThan, isEmpty, isNotEmpty, matchesRegex), "rightValue".
- DISCORD / SLACK / WHATSAPP: send a notification. "variableName" and "content" (the message, may use handlebars variables).

Rules:
- Give every node a unique "key" and reference those keys in "edges".
- Edges leaving a CONDITION node must set "branch" to "true" or "false".
- Prefer WHATSAPP when the user asks to be notified on WhatsApp; never substitute Slack, Discord or email for it.
- Make AI prompts explicit about the expected output format so later conditions can match it, e.g. ask the classifier to answer with exactly URGENT or NOT_URGENT.
- Never invent credentials, ids or fields that are not listed above.`;

const CREDENTIAL_LESS_TYPES = new Set<string>([
  NodeType.MANUAL_TRIGGER,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
  NodeType.HTTP_REQUEST,
  NodeType.DISCORD,
  NodeType.SLACK,
]);

const nodeData = (node: GeneratedNode): Record<string, unknown> => {
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === "key" || key === "type" || value === undefined) continue;
    data[key] = value;
  }

  return data;
};

export type WorkflowLayout = {
  nodes: {
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }[];
  edges: {
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
  }[];
};

/**
 * Turns the model output into React Flow nodes/edges: stable ids, a simple
 * left-to-right layout, and the user's own credential for every node type that
 * needs one.
 */
export const toWorkflowLayout = (
  workflow: GeneratedWorkflow,
  credentialIdByType: Partial<Record<NodeType, string>>,
): WorkflowLayout => {
  const idByKey = new Map(workflow.nodes.map((node) => [node.key, createId()]));

  const nodes = workflow.nodes.map((node, index) => {
    const data = nodeData(node);

    if (!CREDENTIAL_LESS_TYPES.has(node.type)) {
      const credentialId = credentialIdByType[node.type];
      if (credentialId) {
        data.credentialId = credentialId;
      }
    }

    return {
      id: idByKey.get(node.key)!,
      type: node.type,
      position: { x: index * 320, y: 0 },
      data,
    };
  });

  const edges = workflow.edges
    .filter((edge) => idByKey.has(edge.from) && idByKey.has(edge.to))
    .map((edge) => ({
      source: idByKey.get(edge.from)!,
      target: idByKey.get(edge.to)!,
      sourceHandle:
        edge.branch === "true"
          ? TRUE_HANDLE
          : edge.branch === "false"
            ? FALSE_HANDLE
            : "source-1",
      targetHandle: "target-1",
    }));

  return { nodes, edges };
};
