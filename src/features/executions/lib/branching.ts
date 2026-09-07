import type { WorkflowContext } from "../types";

/**
 * Key used to carry branch decisions inside the workflow context.
 * A decision maps a node id to the list of source handles whose outgoing
 * connections are allowed to run. An empty list stops the branch entirely.
 */
export const BRANCH_DECISIONS_KEY = "__branchDecisions";

export type BranchDecisions = Record<string, string[]>;

export const TRUE_HANDLE = "source-true";
export const FALSE_HANDLE = "source-false";

export const withBranchDecision = (
  context: WorkflowContext,
  nodeId: string,
  allowedHandles: string[],
): WorkflowContext => {
  const decisions = getBranchDecisions(context);

  return {
    ...context,
    [BRANCH_DECISIONS_KEY]: {
      ...decisions,
      [nodeId]: allowedHandles,
    },
  };
};

export const getBranchDecisions = (context: WorkflowContext): BranchDecisions =>
  (context[BRANCH_DECISIONS_KEY] as BranchDecisions | undefined) ?? {};

type BranchConnection = {
  fromNodeId: string;
  toNodeId: string;
  fromOutput: string;
};

/**
 * A node is skipped when every path leading into it was closed, either because
 * the upstream node picked a different handle or because it was skipped too.
 */
export const isNodeSkipped = (
  nodeId: string,
  connections: BranchConnection[],
  decisions: BranchDecisions,
  skipped: Set<string>,
): boolean => {
  const incoming = connections.filter(
    (connection) => connection.toNodeId === nodeId,
  );

  if (incoming.length === 0) {
    return false;
  }

  return incoming.every((connection) => {
    if (skipped.has(connection.fromNodeId)) {
      return true;
    }

    const allowedHandles = decisions[connection.fromNodeId];
    return (
      allowedHandles !== undefined &&
      !allowedHandles.includes(connection.fromOutput)
    );
  });
};

export const stripBranchDecisions = (
  context: WorkflowContext,
): WorkflowContext => {
  const { [BRANCH_DECISIONS_KEY]: _decisions, ...rest } = context;
  return rest;
};
