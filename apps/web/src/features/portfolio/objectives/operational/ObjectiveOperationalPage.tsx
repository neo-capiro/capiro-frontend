"use client";
import { objectiveTitle } from "../contracts";
import { lazy, Suspense, useRef, useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import Image from "next/image";
import type { OperationalRead } from "@/shared/capiro/operations/objective-operational";
import { statusLabels, type Objective } from "../contracts";
import { useObjectiveOperational } from "./query";
import {
  OperationalDecisionSection,
  OperationalEngagementSection,
  OperationalWorkSections,
} from "./OperationalSections";
import styles from "./operational.module.css";
import { ObjectiveSavedGenerationCard } from "./ObjectiveSavedGenerationCard";
import { ObjectiveQuestionsPanel } from "../questions/ObjectiveQuestionsPanel";
const ObjectiveAssociationDialog = lazy(() =>
  import("./ObjectiveAssociationDialog").then((module) => ({
    default: module.ObjectiveAssociationDialog,
  })),
);

function Overview({
  read,
  firstEngagementPage,
}: {
  read?: OperationalRead;
  firstEngagementPage: boolean;
}) {
  const next = read?.sections.engagements;
  const firstMeeting =
    firstEngagementPage && next?.coverage === "complete"
      ? next.items[0]
      : undefined;
  const metrics = [
    ["Strategies", read?.sections.strategies.total ?? "Unavailable"],
    [
      "Planner tasks done",
      read?.plannerMetrics.doneCount !== null &&
      read?.plannerMetrics.doneCount !== undefined
        ? `${read.plannerMetrics.doneCount} of ${read.plannerMetrics.taskCount}`
        : "Unavailable",
    ],
    ["Decisions waiting", read?.sections.decisions.total ?? "Unavailable"],
    [
      "Next engagement",
      firstMeeting
        ? new Date(firstMeeting.startsAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : next?.coverage === "complete" && next.total === 0
          ? "None linked"
          : "Unavailable",
    ],
  ];
  return (
    <dl className={styles.overview} aria-label="Objective overview">
      {metrics.map(([label, value]) => (
        <div key={label}>
          <dd>{value}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function SuccessCriteria({ objective }: { objective: Objective }) {
  if (objective.strategyIntake)
    return (
      <section className={styles.panel} aria-label="Saved Strategy intake">
        <header className={styles.panelHead}>
          <h2>Saved Strategy intake</h2>
        </header>
        <dl className={styles.criteria}>
          <div>
            <dt>Goal statement</dt>
            <dd>{objective.strategyIntake.goal || "Not provided"}</dd>
          </div>
          <div>
            <dt>Objective type</dt>
            <dd>{objective.strategyIntake.type || "Not selected"}</dd>
          </div>
          <div>
            <dt>Target outcome date</dt>
            <dd>{objective.strategyIntake.targetDate || "Not provided"}</dd>
          </div>
          <div>
            <dt>Context for Meri</dt>
            <dd>{objective.strategyIntake.meriContext || "Not provided"}</dd>
          </div>
        </dl>
      </section>
    );
  return (
    <section className={styles.panel} aria-label="Success criteria and limits">
      <header className={styles.panelHead}>
        <h2>Success criteria and limits</h2>
      </header>
      <dl className={styles.criteria}>
        <div>
          <dt>Outcome</dt>
          <dd>{objectiveTitle(objective)}</dd>
        </div>
        <div>
          <dt>Minimum win</dt>
          <dd>{objective.minimumWin || "Not defined"}</dd>
        </div>
        <div>
          <dt>Limits</dt>
          <dd>{objective.limits || "Not defined"}</dd>
        </div>
      </dl>
    </section>
  );
}

function LinkedWork({
  query,
  onManage,
  trigger,
}: {
  query: ReturnType<typeof useObjectiveOperational>;
  onManage: () => void;
  trigger: React.RefObject<HTMLButtonElement | null>;
}) {
  const read = query.value;
  if (!read) return null;
  const panels = { read, next: query.next, canNext: query.canNext };
  return (
    <>
      <div className={styles.observation}>
        <small>
          Observed {new Date(read.observedAt).toLocaleString()}. Resource
          permissions and versions are checked again when opened.
        </small>
        <button className="button" onClick={query.reload}>
          Refresh linked work
        </button>
        <button
          className="button"
          ref={trigger}
          disabled={query.loading || read.associationSetVersion === null}
          onClick={onManage}
        >
          Manage links
        </button>
      </div>
      <OperationalDecisionSection {...panels} />
      <OperationalWorkSections {...panels} />
      <OperationalEngagementSection {...panels} />
      <p className={styles.caption}>
        Linked work and saved generation are separate observations. Opening this
        page does not start or continue generation.
      </p>
    </>
  );
}

export function ObjectiveOperationalPage({
  objective,
  onBack,
  onEdit,
  onReloadObjective,
}: {
  objective: Objective;
  onBack: () => void;
  onEdit: () => void;
  onReloadObjective: () => void;
}) {
  const query = useObjectiveOperational(objective);
  const [manageLinks, setManageLinks] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const read = query.value;
  const canEdit = read?.actions.some(
    (action) =>
      action.kind === "edit_objective" &&
      action.expectedObjectiveVersion === objective.version,
  );
  return (
    <section
      className={styles.page}
      data-design-node="411:61442"
      aria-label="Objective operations"
    >
      <button className={styles.back} onClick={onBack}>
        <Image
          src="/figma/objective-operational/arrow-left.svg"
          alt=""
          width={15}
          height={15}
        />
        Objectives
      </button>
      <header className={styles.heading}>
        <div>
          <h1>{objectiveTitle(objective)}</h1>
          <p className={styles.caption}>
            {statusLabels[objective.status]} · Current Objective v
            {objective.version}
          </p>
        </div>
        <button
          className="button"
          disabled={!canEdit || query.loading}
          onClick={onEdit}
        >
          Edit objective
        </button>
      </header>
      <Overview
        read={read}
        firstEngagementPage={query.request.cursors.engagements === null}
      />
      <QueryState
        pending={query.loading}
        error={query.error}
        retry={query.reload}
      />
      {query.error && (
        <button className="button" onClick={onReloadObjective}>
          Reload current objective
        </button>
      )}
      <LinkedWork
        query={query}
        onManage={() => setManageLinks(true)}
        trigger={trigger}
      />
      <ObjectiveSavedGenerationCard objective={objective} />
      <ObjectiveQuestionsPanel
        objective={objective}
        canEdit={Boolean(canEdit) && !query.loading}
        onReloadObjective={onReloadObjective}
      />
      <SuccessCriteria objective={objective} />
      {manageLinks && (
        <Suspense fallback={<p role="status">Loading link editor…</p>}>
          <ObjectiveAssociationDialog
            key={`${objective.clientId}:${objective.id}`}
            objective={objective}
            onClose={() => setManageLinks(false)}
            onRefresh={() => {
              query.reload();
              onReloadObjective();
            }}
            onReturnFocus={() => trigger.current?.focus()}
          />
        </Suspense>
      )}
    </section>
  );
}
