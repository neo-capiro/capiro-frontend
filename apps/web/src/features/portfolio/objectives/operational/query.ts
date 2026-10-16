"use client";
import { useState } from "react";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  operationalReadInput,
  operationalReadRequest,
  requireOperationalRead,
  type OperationalCurrentObjective,
  type OperationalCursors,
  type OperationalPageContext,
  type OperationalRead,
  type OperationalSectionName,
} from "@/shared/capiro/operations/objective-operational";
import { nextOperationalPageContext } from "@/shared/capiro/operations/objective-operational-semantics";

function firstPage() {
  return {
    cursors: {
      strategies: null,
      projects: null,
      decisions: null,
      engagements: null,
    } as OperationalCursors,
    prior: {} as OperationalPageContext,
  };
}

/** Uses the application request lifetime; cursor progress is local receiving state. */
export function useObjectiveOperational(
  objective: OperationalCurrentObjective,
  enabled = true,
) {
  const api = useCapiro();
  const objectiveKey = JSON.stringify(objective);
  const [paging, setPaging] = useState(() => ({
    ...firstPage(),
    api,
    objectiveKey,
  }));
  let current = paging;
  if (paging.api !== api || paging.objectiveKey !== objectiveKey) {
    current = { ...firstPage(), api, objectiveKey };
    setPaging(current);
  }
  const request = operationalReadRequest(
    objective.clientId,
    objective.id,
    current.cursors,
  );
  const read = useCapiroQuery(
    "objectives.operational.read",
    operationalReadInput(request),
    { enabled },
  );
  let value: OperationalRead | undefined;
  let error = read.error;
  if (!read.loading && !error && read.data) {
    try {
      value = requireOperationalRead(
        read.data,
        request,
        objective,
        current.prior,
      );
    } catch {
      error = new Error(
        "This Objective observation no longer matches the current saved view. Reload it.",
      );
    }
  }
  return {
    value,
    loading: read.loading,
    error,
    request,
    canNext: (name: OperationalSectionName) =>
      Boolean(value && !read.loading && value.sections[name].nextCursor),
    next: (name: OperationalSectionName) => {
      if (!value || read.loading || !value.sections[name].nextCursor) return;
      const prior = nextOperationalPageContext(value, name, current.prior);
      setPaging({
        ...current,
        prior,
        cursors: {
          ...current.cursors,
          [name]: value.sections[name].nextCursor,
        },
      });
    },
    reload: () => {
      setPaging({ ...firstPage(), api, objectiveKey });
      read.reload();
    },
  };
}
