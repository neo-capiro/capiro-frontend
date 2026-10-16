"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import Image from "next/image";
import type { OperationalRead } from "@/shared/capiro/operations/objective-operational";
import { statusLabels, type Objective } from "../contracts";
import { useObjectiveOperational } from "./query";
import {
  OperationalDecisionSection,
  OperationalEngagementSection,
  OperationalPanel,
  OperationalWorkSections,
} from "./OperationalSections";
import styles from "./operational.module.css";

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
    ["Open intelligence questions", "Unavailable"],
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
  const read = query.value;
  const canEdit = read?.actions.some(
    (action) =>
      action.kind === "edit_objective" &&
      action.expectedObjectiveVersion === objective.version,
  );
  const panels = { read: read!, next: query.next, canNext: query.canNext };
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
          <h1>{objective.outcome || "Untitled objective"}</h1>
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
      {read && (
        <>
          <div className={styles.observation}>
            <small>
              Observed {new Date(read.observedAt).toLocaleString()}. Resource
              permissions and versions are checked again when opened.
            </small>
            <button className="button" onClick={query.reload}>
              Refresh linked work
            </button>
          </div>
          <OperationalDecisionSection {...panels} />
          <OperationalWorkSections {...panels} />
          <OperationalPanel
            title="Open intelligence questions"
            coverage={read.sections.questions.coverage}
            hasItems={false}
            empty=""
          >
            <p className={styles.caption}>
              Question status is unavailable for this view.
            </p>
          </OperationalPanel>
          <OperationalEngagementSection {...panels} />
          <p className={styles.caption}>
            Requested, Strategy-applied and Planner-applied versions are
            unavailable. Opening this page does not start or continue
            generation.
          </p>
        </>
      )}
      <section
        className={styles.panel}
        aria-label="Success criteria and limits"
      >
        <header className={styles.panelHead}>
          <h2>Success criteria and limits</h2>
        </header>
        <dl className={styles.criteria}>
          <div>
            <dt>Outcome</dt>
            <dd>{objective.outcome || "Not defined"}</dd>
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
    </section>
  );
}
