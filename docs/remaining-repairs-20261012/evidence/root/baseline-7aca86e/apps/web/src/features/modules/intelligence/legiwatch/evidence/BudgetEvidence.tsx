"use client";
import type { z } from "zod";
import type {
  budgetPage,
  budgetProject,
} from "../../../../../shared/capiro/operations/legiwatch-budget-schemas";
import { ActionButton, Badge, Panel } from "../../../../../shared/module-ui";
import { SourceLink } from "../components";
import styles from "../legiwatch.module.css";
import { retainedAmountLabel } from "./budget-presentation";
import type { useEvidenceSelection } from "./use-evidence-selection";

type Page = z.infer<typeof budgetPage>;
type Selection = ReturnType<typeof useEvidenceSelection>;
export function BudgetProjects({
  data,
  selection,
  canSave,
  onProject,
  onCompare,
}: {
  data: Page;
  selection: Selection;
  canSave: boolean;
  onProject: (id: string) => void;
  onCompare: () => void;
}) {
  return (
    <Panel title="Retained project evidence" description={data.notice}>
      <div className={styles.list}>
        {data.projects.map((project) => (
          <BudgetProjectRow
            key={project.id}
            project={project}
            selection={selection}
            canSave={canSave}
            onProject={onProject}
          />
        ))}
        {!data.projects.length && (
          <p className={styles.description}>
            No retained projects match these filters.
          </p>
        )}
      </div>
      {data.amounts.length > 0 && (
        <div className={styles.form}>
          <h3>Exact retained observations</h3>
          {data.amounts.map((amount) => (
            <article className={styles.listItem} key={amount.id}>
              <strong>{retainedAmountLabel(amount.observation)}</strong>
              <p className={styles.description}>
                {amount.observation.chamber} · {amount.observation.stage} ·{" "}
                {amount.observation.fund} · {amount.observation.basis} ·{" "}
                {amount.observation.valueRole ?? "allocation amount"} ·{" "}
                {amount.observation.locator}
              </p>
              <Badge>
                {amount.observation.qualified
                  ? "Qualified source"
                  : "Source not qualified"}
              </Badge>
              <ActionButton
                onClick={() =>
                  selection.setExact({
                    kind: "budget",
                    id: amount.observation.documentId,
                  })
                }
              >
                Exact source
              </ActionButton>
            </article>
          ))}
          <ActionButton disabled={data.amounts.length < 2} onClick={onCompare}>
            Compare retained amounts
          </ActionButton>
        </div>
      )}
    </Panel>
  );
}
function BudgetProjectRow({
  project,
  selection,
  canSave,
  onProject,
}: {
  project: z.infer<typeof budgetProject>;
  selection: Selection;
  canSave: boolean;
  onProject: (id: string) => void;
}) {
  const first = project.recentAmounts[0]?.observation;
  return (
    <article className={styles.listItem}>
      <strong>{project.title}</strong>
      <p className={styles.description}>
        Project {project.id} · Fiscal year {project.fiscal_year}
      </p>
      {project.recentAmounts.map((amount) => (
        <p key={amount.id} className={styles.description}>
          {amount.observation.chamber} · {amount.observation.stage} ·{" "}
          {amount.observation.fund} · {retainedAmountLabel(amount.observation)}
        </p>
      ))}
      <div className={styles.actions}>
        <ActionButton onClick={() => onProject(project.id)}>
          Open project evidence
        </ActionButton>
        <ActionButton
          disabled={!first}
          onClick={() => {
            if (first)
              selection.setExact({ kind: "budget", id: first.documentId });
          }}
        >
          Open exact source
        </ActionButton>
        <ActionButton
          disabled={!canSave}
          title={!canSave ? "Choose an editable folder first." : undefined}
          onClick={() =>
            selection.setTracking({
              kind: "budget",
              id: project.id,
              saved: project.saved,
              version: project.tracking_version ?? 0,
            })
          }
        >
          {project.saved ? "Remove from folder" : "Save to folder"}
        </ActionButton>
      </div>
    </article>
  );
}
export function BudgetDocuments({
  data,
  onSource,
}: {
  data: Page;
  onSource: (id: string) => void;
}) {
  return (
    <Panel
      title="Documents & offers"
      description="This is a bounded retained-source list, not a complete statewide inventory."
    >
      <div className={styles.list}>
        {data.documents.map((document) => (
          <article className={styles.listItem} key={document.id}>
            <strong>{document.title}</strong>
            <p className={styles.description}>
              {document.publisher} · {document.chamber} · {document.stage} ·{" "}
              {document.role}
              {document.offer ? ` · Offer ${document.offer}` : ""} ·{" "}
              {document.publication_date
                ? `Published ${document.publication_date}`
                : "Publication date not stated"}
            </p>
            <Badge>
              {document.complete
                ? "Complete retained text"
                : "Partial retained text"}
            </Badge>
            <div className={styles.actions}>
              <ActionButton onClick={() => onSource(document.id)}>
                Exact source
              </ActionButton>
              <SourceLink href={document.source_url}>
                Official publication
              </SourceLink>
            </div>
          </article>
        ))}
      </div>
      {!data.documents.length && (
        <p className={styles.description}>
          No documents returned for this fiscal year and session.
        </p>
      )}
    </Panel>
  );
}
export function BudgetUpdates({ data }: { data: Page }) {
  return (
    <Panel
      title="Retained budget updates"
      description="Source events are bounded to the selected fiscal year and session. Project filtering applies only to returned events."
    >
      <div className={styles.list}>
        {data.events.map((event) => (
          <article className={styles.listItem} key={event.id}>
            <strong>{event.title}</strong>
            <p className={styles.description}>
              {event.stage} · {event.kind ?? "Source observation"}
              {event.observed_at ? ` · Observed ${event.observed_at}` : ""}
            </p>
            <SourceLink href={event.source_url}>
              Open exact publication
            </SourceLink>
          </article>
        ))}
      </div>
      {!data.events.length && (
        <p className={styles.description}>No retained events in this scope.</p>
      )}
    </Panel>
  );
}
