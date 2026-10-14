"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/shared/portfolio/api/provider";
import { objectiveDestinationQuery } from "@/shared/capiro/operations/objective-destination-binding";
import type { Objective } from "./contracts";
import {
  resolveObjectiveWork,
  type ObjectiveWorkKind,
} from "./objective-work-sources";

export function useObjectiveWorkDestination(
  objective: Objective,
  disabled: boolean,
) {
  const api = useApi(),
    router = useRouter();
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error>();
  useLayoutEffect(
    () => () => {
      active.current?.abort();
    },
    [api, objective.id, objective.version, disabled],
  );
  async function open(
    kind: ObjectiveWorkKind,
    resourceId: string,
    versionId: string,
    selection: {
      taskVersion?: number;
      snapshotHash?: string;
      isCurrent?: () => boolean;
    } = {},
  ) {
    if (disabled || active.current) return;
    const controller = new AbortController();
    const captured = { ...selection };
    const current = () =>
      active.current === controller &&
      !controller.signal.aborted &&
      (captured.isCurrent?.() ?? true);
    active.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      const query = objectiveDestinationQuery.parse({
        clientId: objective.clientId,
        objectiveId: objective.id,
        objectiveVersion: objective.version,
      });
      const href = await resolveObjectiveWork(
        api,
        kind,
        resourceId,
        versionId,
        query,
        controller.signal,
        captured,
      );
      if (!current()) return;
      router.push(href);
    } catch (cause) {
      if (current())
        setError(
          cause instanceof Error
            ? cause
            : new Error("Objective destination unavailable."),
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return { open, busy, error };
}
