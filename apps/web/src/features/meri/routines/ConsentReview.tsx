"use client";
import { useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import type { RoutineWorkflow } from "../../../shared/meri-routines/workflow";
import type { RoutinesConsentObservation } from "../../../shared/meri-routines/consent";
import styles from "../ui/meri-ui.module.css";

const CONSENT_LABEL: Record<RoutinesConsentObservation["state"], string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Withdrawn",
  absent: "No consent on record",
  unknown: "Not observable",
};
const when = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * The read consent Core holds for this routine's exact current pins, kept separate from the schedule's own state: a
 * paused routine with expired consent is two facts, `unknown` is never shown as an absence, and a moved observation is
 * shown as changed rather than as current. Nothing here approves anything.
 */
export function consentLabel(
  observation: RoutinesConsentObservation | null,
): string {
  if (!observation) return "Not read";
  const moved = observation.stale || !observation.pinsMatched;
  return `${CONSENT_LABEL[observation.state]}${
    moved ? " · changed since this schedule was saved" : ""
  }`;
}

/**
 * The owner's explicit review-then-approve renewal over one routine. The review is read-only; the approval is a
 * separate, deliberate click over exactly the review on screen, and it reuses the same decision for every attempt so a
 * lost acknowledgement can never become a second approval. It never resumes, starts or re-enables the routine.
 */
export function ConsentReview({
  port,
  scheduleId,
  observation,
  disabled,
}: {
  port: RoutineWorkflow;
  scheduleId: string;
  observation: RoutinesConsentObservation | null;
  disabled: boolean;
}) {
  const state = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
  const held = state.consent?.scheduleId === scheduleId ? state.consent : null;
  const busy = disabled || state.busy;
  return (
    <section aria-label="Routine consent and renewal">
      <p className={styles.muted}>Read consent: {consentLabel(observation)}</p>
      {observation?.observedAtMs != null && (
        <p className={styles.muted}>
          Observed {when(observation.observedAtMs)}
          {observation.expiresAtMs != null
            ? `; the observed consent expires ${when(observation.expiresAtMs)}`
            : ""}
          .{observation.scopeCount != null ? ` Scopes: ${observation.scopeCount}.` : ""}
        </p>
      )}
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void port.reviewConsent(scheduleId)}
      >
        Review renewal
      </Button>
      {held && (
        <>
          <p className={styles.muted}>
            Original intent {held.review.intent.intentId.slice(0, 8)} · generation{" "}
            {held.review.generation} · {held.review.intent.projection.scopes.length}{" "}
            scope(s). Effective per run: $
            {(held.review.limits.maxCostMicrousd / 1_000_000).toFixed(6)},{" "}
            {held.review.limits.maxRuntimeSeconds} seconds,{" "}
            {held.review.limits.retryLimit} retries.
          </p>
          <p className={styles.muted}>
            {/* The canonical intent allows the digest to be ABSENT; an absent digest is shown as unavailable rather
                than as an invented or truncated value, and it is never dereferenced. */}
            {held.review.intent.taskInstructionSha256
              ? `Original instruction digest ${held.review.intent.taskInstructionSha256.slice(0, 16)}.`
              : "Original instruction digest unavailable."}{" "}
            Destination: {held.review.intent.projection.destinationId}. Timezone:{" "}
            {held.review.intent.projection.timezone}. Reviewed consent:{" "}
            {consentLabel(held.review.consent)}
          </p>
          <Button
            disabled={busy || held.window !== null}
            onClick={() => void port.renewConsent()}
          >
            {held.unknown ? "Retry this exact approval" : "Renew consent now"}
          </Button>
          <p className={styles.muted}>
            Renewing records your approval for this reviewed intent only. It does not
            resume, start or re-enable the routine.
          </p>
          {held.window && (
            <p role="status">
              Renewal recorded
              {held.window.state === "active"
                ? " and current"
                : " but already lapsed"}{" "}
              for generation {held.window.generation}
              {held.window.idempotent
                ? " (this approval was already recorded)"
                : ""}
              ; expires {when(held.window.expiresAtMs)}.
            </p>
          )}
          {held.unknown && (
            <p role="alert">
              The outcome of this approval is not confirmed. The same approval is
              retained; retrying it cannot record a second one.
            </p>
          )}
        </>
      )}
      {state.message && <p role="alert">{state.message}</p>}
    </section>
  );
}
