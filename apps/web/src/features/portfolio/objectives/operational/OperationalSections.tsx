import Link from "next/link";
import type { ReactNode } from "react";
import type {
  OperationalCoverage,
  OperationalProvenance,
  OperationalRead,
  OperationalSectionName,
} from "@/shared/capiro/operations/objective-operational";
import {
  operationalResourceHref,
  operationalReviewHref,
} from "./operational-links";
import styles from "./operational.module.css";

const coverageText: Record<OperationalCoverage, string> = {
  complete: "All currently readable linked work is covered.",
  partial: "Some linked work could not be verified. Totals are unavailable.",
  unbound: "Verified links are not available for this section.",
  unavailable: "This information could not be read. Refresh to try again.",
  not_implemented: "This information is not connected yet.",
};

export function OperationalPanel({
  title,
  coverage,
  empty,
  hasItems,
  children,
  next,
}: {
  title: string;
  coverage: OperationalCoverage;
  empty: string;
  hasItems: boolean;
  children?: ReactNode;
  next?: () => void;
}) {
  return (
    <section className={styles.panel} aria-label={title}>
      <header className={styles.panelHead}>
        <h2>{title}</h2>
      </header>
      <div className={styles.panelBody}>
        <p className={styles.caption}>{coverageText[coverage]}</p>
        {children}
        {!hasItems && coverage === "complete" && <p>{empty}</p>}
        {next && (
          <button className="button" onClick={next}>
            Next page
          </button>
        )}
      </div>
    </section>
  );
}

function Provenance({ items }: { items: OperationalProvenance[] }) {
  const versions = [
    ...new Set(
      items.map((item) =>
        item.kind === "manual"
          ? `Human link · Objective v${item.linkedRevision.version}`
          : `Saved work receipt · Objective v${item.sourceRevision.version}`,
      ),
    ),
  ];
  return <small className={styles.caption}>{versions.join("; ")}</small>;
}

type Props = {
  read: OperationalRead;
  next: (name: OperationalSectionName) => void;
  canNext: (name: OperationalSectionName) => boolean;
};

export function OperationalWorkSections({ read, next, canNext }: Props) {
  const { strategies, projects } = read.sections;
  return (
    <div className={styles.workColumns}>
      <OperationalPanel
        title="Strategies across cycles"
        coverage={strategies.coverage}
        hasItems={strategies.items.length > 0}
        empty="No readable Strategies are linked."
        next={canNext("strategies") ? () => next("strategies") : undefined}
      >
        {strategies.items.map((row) => {
          const href = operationalResourceHref(
            row.resource,
            read.actions,
            read.scope.clientId,
          );
          return (
            <article
              className={styles.resource}
              key={row.resource.selection.id}
            >
              <div className="row between">
                <h3>{row.resource.title || "Title unavailable"}</h3>
                {href && (
                  <Link className="button" href={href}>
                    Open Strategy
                  </Link>
                )}
              </div>
              <p>{row.strategyType}</p>
              {row.cycles.length ? (
                <ul className={styles.cycles}>
                  {row.cycles.map((cycle) => (
                    <li key={JSON.stringify(cycle)}>
                      <strong>FY{cycle.fiscalYear}</strong>
                      {cycle.authorityTrack && (
                        <span>{cycle.authorityTrack}</span>
                      )}
                      <small>Human annotation</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.caption}>No cycle annotation supplied.</p>
              )}
              <Provenance items={row.provenance} />
            </article>
          );
        })}
      </OperationalPanel>
      <OperationalPanel
        title="Planner projects"
        coverage={projects.coverage}
        hasItems={projects.items.length > 0}
        empty="No readable Planner projects are linked."
        next={canNext("projects") ? () => next("projects") : undefined}
      >
        <p className={styles.caption}>
          Shared tasks and multiple projects retain their current memberships.
        </p>
        {projects.items.map((row) => {
          const href = operationalResourceHref(
            row.resource,
            read.actions,
            read.scope.clientId,
          );
          return (
            <article
              className={styles.resource}
              key={row.resource.selection.id}
            >
              <h3>{row.resource.title || "Title unavailable"}</h3>
              <Provenance items={row.provenance} />
              {href && (
                <Link className="button" href={href}>
                  Open in Planner
                </Link>
              )}
            </article>
          );
        })}
        <dl className={styles.metrics}>
          <div>
            <dt>Current tasks</dt>
            <dd>{read.plannerMetrics.taskCount ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Done</dt>
            <dd>{read.plannerMetrics.doneCount ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Overdue</dt>
            <dd>{read.plannerMetrics.overdueCount ?? "Unavailable"}</dd>
          </div>
        </dl>
      </OperationalPanel>
    </div>
  );
}

export function OperationalDecisionSection({ read, next, canNext }: Props) {
  const section = read.sections.decisions;
  return (
    <OperationalPanel
      title="Decisions waiting"
      coverage={section.coverage}
      hasItems={section.items.length > 0}
      empty="No pending decisions are linked."
      next={canNext("decisions") ? () => next("decisions") : undefined}
    >
      {section.items.map((row) => {
        const resource =
          row.kind === "planner_approval" ? row.task : row.session;
        const href =
          row.kind === "planner_approval"
            ? operationalReviewHref(row.task, read.actions, read.scope.clientId)
            : undefined;
        return (
          <article
            className={styles.decision}
            key={`${row.kind}:${resource.selection.id}:${row.kind === "outreach_proposal" ? row.proposalId : ""}`}
          >
            <div>
              <h3>
                {row.kind === "outreach_proposal"
                  ? row.title
                  : resource.title || "Title unavailable"}
              </h3>
              <Provenance items={row.provenance} />
            </div>
            {href ? (
              <Link className="button primary" href={href}>
                Review in Planner
              </Link>
            ) : (
              <span className={styles.caption}>Review action unavailable</span>
            )}
          </article>
        );
      })}
    </OperationalPanel>
  );
}

export function OperationalEngagementSection({ read, next, canNext }: Props) {
  const section = read.sections.engagements;
  return (
    <OperationalPanel
      title="Linked engagements"
      coverage={section.coverage}
      hasItems={section.items.length > 0}
      empty="No upcoming readable meetings are linked."
      next={canNext("engagements") ? () => next("engagements") : undefined}
    >
      {section.items.map((row) => {
        const href = operationalResourceHref(
          row.resource,
          read.actions,
          read.scope.clientId,
        );
        return (
          <article className={styles.decision} key={row.resource.selection.id}>
            <div>
              <h3>{row.resource.title || "Title unavailable"}</h3>
              <time dateTime={row.startsAt}>
                {new Date(row.startsAt).toLocaleString()}
              </time>
              <Provenance items={row.provenance} />
            </div>
            {href && (
              <Link className="button" href={href}>
                Open meeting
              </Link>
            )}
          </article>
        );
      })}
    </OperationalPanel>
  );
}
