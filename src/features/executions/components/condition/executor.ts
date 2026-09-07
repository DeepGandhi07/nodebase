import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import {
  FALSE_HANDLE,
  TRUE_HANDLE,
  withBranchDecision,
} from "@/features/executions/lib/branching";
import type { NodeExecutor } from "@/features/executions/types";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

export const CONDITION_OPERATORS = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "greaterThan",
  "lessThan",
  "isEmpty",
  "isNotEmpty",
  "matchesRegex",
] as const;

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

type ConditionData = {
  variableName?: string;
  leftValue?: string;
  operator?: ConditionOperator;
  rightValue?: string;
  caseSensitive?: boolean;
};

export const evaluateCondition = (
  left: string,
  operator: ConditionOperator,
  right: string,
  caseSensitive = false,
): boolean => {
  const a = caseSensitive ? left : left.toLowerCase();
  const b = caseSensitive ? right : right.toLowerCase();

  switch (operator) {
    case "equals":
      return a === b;
    case "notEquals":
      return a !== b;
    case "contains":
      return a.includes(b);
    case "notContains":
      return !a.includes(b);
    case "startsWith":
      return a.startsWith(b);
    case "endsWith":
      return a.endsWith(b);
    case "greaterThan":
      return Number(left) > Number(right);
    case "lessThan":
      return Number(left) < Number(right);
    case "isEmpty":
      return a.trim().length === 0;
    case "isNotEmpty":
      return a.trim().length > 0;
    case "matchesRegex":
      return new RegExp(right, caseSensitive ? "" : "i").test(left);
    default:
      throw new NonRetriableError(
        `Condition node: Unsupported operator "${operator}"`,
      );
  }
};

export const ConditionExecutor: NodeExecutor<ConditionData> = async ({
  data,
  nodeId,
  context,
  step,
  conditionCh,
}) => {
  await step.realtime.publish(`${nodeId}-loading`, conditionCh.status, {
    nodeId,
    status: "loading",
  });

  try {
    if (!data.variableName) {
      throw new NonRetriableError("Condition node: Variable name is missing");
    }

    if (!data.leftValue) {
      throw new NonRetriableError("Condition node: Value to check is missing");
    }

    const operator = data.operator ?? "contains";

    const left = decode(Handlebars.compile(data.leftValue)(context));
    const right = data.rightValue
      ? decode(Handlebars.compile(data.rightValue)(context))
      : "";

    const result = await step.run(`condition-${nodeId}`, async () =>
      evaluateCondition(left, operator, right, data.caseSensitive),
    );

    await step.realtime.publish(`${nodeId}-success`, conditionCh.status, {
      nodeId,
      status: "success",
    });

    return withBranchDecision(
      {
        ...context,
        [data.variableName]: { result, left, right, operator },
      },
      nodeId,
      [result ? TRUE_HANDLE : FALSE_HANDLE],
    );
  } catch (error) {
    await step.realtime.publish(`${nodeId}-error`, conditionCh.status, {
      nodeId,
      status: "error",
    });
    throw error;
  }
};
