"use client";
import { useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  engagementPlanReviewBody,
  type EngagementPlan,
} from "../../../../shared/capiro/operations/engagement-plans";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import type { PlanCommands } from "./usePlanCommands";
import styles from "./plan.module.css";

export function PlanReviewHistory({
  plan,
  commands,
}: {
  plan: EngagementPlan;
  commands: PlanCommands;
}) {
  const api = useCapiro();
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string>();
  const [showHistory, setShowHistory] = useState(false);
  const [beforeVersion, setBeforeVersion] = useState<number>();
  const history = useCapiroQuery(
    "engagement.plans.history",
    { params: { planId: plan.id }, query: { beforeVersion, limit: 25 } },
    { enabled: showHistory },
  );
  const mismatch =
    history.data &&
    (history.data.planId !== plan.id ||
      history.data.clientId !== plan.clientId ||
      history.data.planVersion < plan.version ||
      (beforeVersion !== undefined &&
        history.data.items.some((item) => item.version >= beforeVersion)));
  async function recordReview(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const body = engagementPlanReviewBody.parse({
        expectedPlanVersion: plan.version,
        reviewDueAt: deadline,
      });
      await commands.run({
        label: "Manual review",
        request: () =>
          api.request("engagement.plans.review", {
            params: { planId: plan.id },
            body,
          }),
        expected: {
          clientId: plan.clientId,
          planId: plan.id,
          version: plan.version + 1,
          reviewedVersion: plan.version + 1,
          reviewDueAt: new Date(body.reviewDueAt).toISOString(),
        },
      });
    } catch {
      setError(
        "Use a full future ISO timestamp including seconds and an explicit Z or numeric timezone offset.",
      );
    }
  }
  return (
    <section className={styles.stack} aria-label="Plan review and history">
      <h3>Manual review</h3>
      <p className={styles.muted}>
        Freshness describes an explicitly reviewed plan version. It does not
        verify external events or guarantee office availability. Every later
        aggregate change invalidates the review basis.
      </p>
      {plan.reviewDueAt && (
        <p>
          Recorded review deadline: <time>{plan.reviewDueAt}</time>
        </p>
      )}
      <form
        className={styles.tools}
        onSubmit={(event) => void recordReview(event)}
      >
        <Field
          label="Future review deadline (ISO timestamp with offset)"
          htmlFor="plan-review-deadline"
        >
          <TextInput
            id="plan-review-deadline"
            required
            placeholder="2050-12-01T12:00:00Z"
            value={deadline}
            disabled={commands.blocked || plan.lifecycle === "archived"}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </Field>
        <ActionButton
          type="submit"
          disabled={commands.blocked || plan.lifecycle === "archived"}
        >
          Record review
        </ActionButton>
        {error && <p role="alert">{error}</p>}
      </form>
      <ActionButton
        aria-expanded={showHistory}
        onClick={() => setShowHistory((value) => !value)}
      >
        {showHistory ? "Hide history" : "View history"}
      </ActionButton>
      {showHistory && (
        <StatusPanel
          loading={history.loading}
          error={
            mismatch
              ? "History did not match this current plan. Reload the plan."
              : history.error
          }
          onRetry={history.reload}
        >
          {history.data && !mismatch && (
            <div className={styles.stack}>
              <p className={styles.muted}>
                History page is {history.data.completeness}. Office-reference
                availability is checked now, not at the historical revision
                date.
              </p>
              {history.data.planVersion > plan.version && (
                <p role="status">
                  History observed a newer plan version. Reload the current plan
                  before editing.
                </p>
              )}
              {history.data.items.length === 0 && (
                <p>No revisions on this history page.</p>
              )}
              {history.data.items.map((item) => (
                <article className={styles.wave} key={item.version}>
                  <h4>
                    Version {item.version}:{" "}
                    {item.operation.replaceAll("_", " ")}
                  </h4>
                  <p>
                    {item.snapshot.title} · {item.snapshot.lifecycle}
                  </p>
                  <time>{item.createdAt}</time>
                  <p className={styles.muted}>
                    {item.snapshot.waves.length} recorded waves. This snapshot
                    does not carry a current freshness assessment.
                  </p>
                </article>
              ))}
              <div className={styles.tools}>
                <ActionButton
                  disabled={history.loading || beforeVersion === undefined}
                  onClick={() => setBeforeVersion(undefined)}
                >
                  Newest history
                </ActionButton>
                <ActionButton
                  disabled={
                    history.loading ||
                    !history.data.pagination.hasMore ||
                    history.data.pagination.beforeVersion === null
                  }
                  onClick={() =>
                    setBeforeVersion(history.data!.pagination.beforeVersion!)
                  }
                >
                  Older history
                </ActionButton>
              </div>
            </div>
          )}
        </StatusPanel>
      )}
    </section>
  );
}
