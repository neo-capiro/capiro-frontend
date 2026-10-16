"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CapiroApiError } from "../../../../shared/capiro/http";
import {
  engagementPlanCreationSchema,
  engagementPlanSchema,
  type EngagementPlan,
  type EngagementPlanWave,
} from "../../../../shared/capiro/operations/engagement-plans";

type Expected = {
  clientId: string;
  planId?: string;
  version?: number;
  waveId?: string;
  lifecycle?: EngagementPlan["lifecycle"];
  waveArchived?: boolean;
  wavePatch?: Partial<
    Pick<
      EngagementPlanWave,
      "title" | "formatLabel" | "window" | "officeTargetIds"
    >
  >;
  waveOrder?: string[];
  title?: string;
  reviewedVersion?: number;
  reviewDueAt?: string;
  creation?: {
    operation: "create_plan" | "create_wave";
    requestId: string;
    planVersion: number;
  };
};
type Command = {
  label: string;
  request: () => Promise<unknown>;
  expected: Expected;
};
type PlanOwner = { clientId: string; planId?: string };

export function matchesPlanReadOwner(
  plan: EngagementPlan,
  owner: PlanOwner | null,
) {
  return Boolean(
    owner?.planId &&
    owner.planId === plan.id &&
    owner.clientId === plan.clientId,
  );
}

/** Current-plan receiving fences; transport/session disposal stays in canonical useCapiro. */
export function acceptPlanCommand(value: unknown, expected: Expected) {
  const result = expected.creation
    ? engagementPlanCreationSchema.parse(value)
    : null;
  const plan = result?.aggregate ?? engagementPlanSchema.parse(value);
  const versionMismatch =
    expected.version !== undefined &&
    (result?.reconciled
      ? plan.version < expected.version
      : plan.version !== expected.version);
  if (
    plan.clientId !== expected.clientId ||
    (expected.planId && plan.id !== expected.planId) ||
    versionMismatch ||
    (expected.lifecycle && plan.lifecycle !== expected.lifecycle) ||
    (expected.title && plan.title !== expected.title)
  )
    throw new Error(
      "The response did not confirm this current plan. Reload to confirm the result.",
    );
  if (result && expected.creation) {
    const receipt = result.receipt;
    if (
      receipt.operation !== expected.creation.operation ||
      receipt.requestId !== expected.creation.requestId ||
      receipt.clientId !== plan.clientId ||
      receipt.planId !== plan.id ||
      receipt.planVersion !== expected.creation.planVersion ||
      receipt.planVersion > plan.version ||
      (!result.reconciled && plan.version !== receipt.planVersion) ||
      (receipt.operation === "create_wave" &&
        !plan.waves.some((wave) => wave.id === receipt.waveId))
    )
      throw new Error(
        "The creation receipt did not match the original request. Reconcile the original request.",
      );
  }
  if (
    expected.reviewedVersion &&
    (plan.reviewedPlanVersion !== expected.reviewedVersion ||
      !plan.reviewedAt ||
      !plan.reviewedByUserId ||
      plan.reviewDueAt !== expected.reviewDueAt)
  )
    throw new Error(
      "The response did not confirm the explicit version and deadline reviewed. Reload to confirm the result.",
    );
  if (expected.waveId) {
    const wave = plan.waves.find((item) => item.id === expected.waveId);
    if (
      !wave ||
      (expected.waveArchived !== undefined &&
        Boolean(wave.archivedAt) !== expected.waveArchived)
    )
      throw new Error(
        "The response did not confirm this wave. Reload to confirm the result.",
      );
    for (const [key, value] of Object.entries(expected.wavePatch ?? {})) {
      if (value === undefined) continue;
      const actual = wave[key as keyof EngagementPlanWave];
      const matches =
        key === "officeTargetIds"
          ? JSON.stringify([...(actual as string[])].sort()) ===
            JSON.stringify([...(value as string[])].sort())
          : JSON.stringify(actual) === JSON.stringify(value);
      if (!matches)
        throw new Error(
          "The response did not confirm the requested wave fields. Reload to confirm the result.",
        );
    }
  }
  if (expected.waveOrder) {
    const order = [...plan.waves]
      .filter((wave) => !wave.archivedAt)
      .sort((a, b) => a.position - b.position)
      .map((wave) => wave.id);
    if (JSON.stringify(order) !== JSON.stringify(expected.waveOrder))
      throw new Error(
        "The response did not confirm the requested wave order. Reload to confirm the result.",
      );
  }
  return plan;
}

export function usePlanCommands(onSaved: (plan: EngagementPlan) => void) {
  // Original creation commands live only in this mounted scope; this is not a durable request journal.
  const active = useRef(true);
  const pending = useRef(false);
  const retainedCreation = useRef<Command | null>(null);
  const commandOwner = useRef<PlanOwner | null>(null);
  const uncertainRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const [hasRetainedCreation, setHasRetainedCreation] = useState(false);
  const [message, setMessage] = useState<string>();
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function run(command: Command, reconciliation = false) {
    if (pending.current || (uncertainRef.current && !reconciliation))
      return false;
    pending.current = true;
    commandOwner.current = command.expected;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    if (command.expected.creation) {
      retainedCreation.current = command;
      setHasRetainedCreation(true);
    }
    try {
      const plan = acceptPlanCommand(await command.request(), command.expected);
      if (!active.current) return false;
      retainedCreation.current = null;
      setHasRetainedCreation(false);
      commandOwner.current = null;
      uncertainRef.current = false;
      setUncertain(false);
      onSaved(plan);
      setMessage(`${command.label} confirmed from the current plan response.`);
      return true;
    } catch (cause) {
      if (!active.current) return false;
      const unknown = !(
        cause instanceof CapiroApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status)
      );
      uncertainRef.current = unknown;
      setUncertain(unknown);
      const detail =
        cause instanceof Error
          ? cause.message
          : "The request could not be confirmed.";
      setError(
        cause instanceof CapiroApiError && cause.status === 409
          ? `The plan changed or the request conflicted. Reload the current plan before trying again. ${detail}`
          : detail,
      );
      if (!unknown) {
        retainedCreation.current = null;
        setHasRetainedCreation(false);
        commandOwner.current = null;
      }
      return false;
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }
  const acknowledgeRead = useCallback((plan: EngagementPlan) => {
    if (
      !pending.current &&
      !retainedCreation.current &&
      uncertainRef.current &&
      matchesPlanReadOwner(plan, commandOwner.current)
    ) {
      commandOwner.current = null;
      uncertainRef.current = false;
      setUncertain(false);
      setError(undefined);
    } else if (!pending.current && !uncertainRef.current) setError(undefined);
  }, []);
  return {
    busy,
    error,
    uncertain,
    message,
    blocked: busy || uncertain,
    run,
    canReconcile: uncertain && hasRetainedCreation,
    reconcile: () => {
      const command = retainedCreation.current;
      return command ? run(command, true) : Promise.resolve(false);
    },
    acknowledgeRead,
  };
}
export type PlanCommands = ReturnType<typeof usePlanCommands>;
