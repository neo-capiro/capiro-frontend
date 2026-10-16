"use client";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { EngagementPlan } from "../../../../shared/capiro/operations/engagement-plans";
import { ActionButton, Badge } from "../../../../shared/module-ui";
import { PlanTitleEditor } from "./PlanEditor";
import { PlanReviewHistory } from "./PlanReviewHistory";
import { PlanWaves } from "./PlanWaves";
import type { PlanCommands } from "./usePlanCommands";
import styles from "./plan.module.css";

export function PlanDetail({
  plan,
  commands,
  onReload,
}: {
  plan: EngagementPlan;
  commands: PlanCommands;
  onReload: () => void;
}) {
  const api = useCapiro();
  function change(action: "activate" | "deactivate" | "archive" | "restore") {
    const lifecycle =
      action === "activate"
        ? "active"
        : action === "archive"
          ? "archived"
          : "draft";
    return commands.run({
      label: `Plan ${action}`,
      request: () =>
        api.request("engagement.plans.update", {
          params: { planId: plan.id },
          body: { expectedPlanVersion: plan.version, action },
        }),
      expected: {
        clientId: plan.clientId,
        planId: plan.id,
        version: plan.version + 1,
        lifecycle,
      },
    });
  }
  return (
    <section className={styles.detail} aria-label="Selected engagement plan">
      <div className={styles.tools}>
        <h2>{plan.title}</h2>
        <Badge>{plan.lifecycle}</Badge>
        <Badge>{plan.review.status}</Badge>
        <span className={styles.muted}>Version {plan.version}</span>
        <ActionButton onClick={onReload} disabled={commands.busy}>
          Reload current plan
        </ActionButton>
      </div>
      <p className={styles.muted}>
        {plan.review.reason.replaceAll("_", " ")} · checked{" "}
        {plan.review.checkedAt}
      </p>
      {plan.lifecycle === "archived" && (
        <p role="status">
          This archived plan is read-only. Restore returns it to draft; it does
          not reactivate it or renew its review.
        </p>
      )}
      <PlanTitleEditor plan={plan} commands={commands} />
      <div className={styles.tools}>
        {plan.lifecycle !== "archived" ? (
          <>
            <ActionButton
              disabled={commands.blocked}
              onClick={() =>
                void change(
                  plan.lifecycle === "draft" ? "activate" : "deactivate",
                )
              }
            >
              {plan.lifecycle === "draft" ? "Activate plan" : "Return to draft"}
            </ActionButton>
            <ActionButton
              disabled={commands.blocked}
              onClick={() => void change("archive")}
            >
              Archive plan
            </ActionButton>
          </>
        ) : (
          <ActionButton
            disabled={commands.blocked}
            onClick={() => void change("restore")}
          >
            Restore to draft
          </ActionButton>
        )}
      </div>
      {plan.objectiveBinding && (
        <p className={styles.muted}>
          Recorded Objective revision {plan.objectiveBinding.objectiveVersion} ·{" "}
          {plan.objectiveBinding.objectiveId}. This does not trigger generation
          or activation.
        </p>
      )}
      <div>
        <h3>Recorded office references</h3>
        {plan.officeReferences.length ? (
          <ul>
            {plan.officeReferences.map((office) => (
              <li key={office.targetId}>
                {office.officeKey} ·{" "}
                {office.available
                  ? "current reference available"
                  : "reference currently unavailable"}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>
            No office references are recorded. An authorized office picker is
            not available in this view.
          </p>
        )}
      </div>
      <PlanWaves plan={plan} commands={commands} />
      <PlanReviewHistory plan={plan} commands={commands} />
    </section>
  );
}
