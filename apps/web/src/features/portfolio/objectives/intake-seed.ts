import { STRATEGY_INTAKE_FIELDS } from "@capiro/shared/strategy-intake";

/**
 * The seed a "Start the objective intake" link carries into `/portfolio/<clientId>/objectives?new=1`.
 * Meri's conversation offers that link when the user asks it to create or plan an objective
 * (meri-greenfield `apps/worker/conversation/request-context.mjs`): the client comes from the route,
 * the goal statement and context for Meri from these two query parameters. The intake stays the only
 * writer; a seed only fills the fields the user then reviews and saves.
 */
export const INTAKE_SEED_PARAMS = ["goal", "context"] as const;
export type ObjectiveIntakeSeed = { goal: string; meriContext: string };

const clip = (value: string | null, maxLength: number) =>
  (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);

/** The seeded Strategy-intake answers, or undefined when the address carries none. */
export function objectiveIntakeSeed(
  params: URLSearchParams,
): ObjectiveIntakeSeed | undefined {
  const goal = clip(params.get("goal"), STRATEGY_INTAKE_FIELDS.goal.maxLength);
  const meriContext = clip(
    params.get("context"),
    STRATEGY_INTAKE_FIELDS.meriContext.maxLength,
  );
  return goal || meriContext ? { goal, meriContext } : undefined;
}

/** Drops the seed with the other intake-only parameters once the intake closes or saves. */
export function withoutIntakeSeed(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of INTAKE_SEED_PARAMS) next.delete(key);
  return next;
}
