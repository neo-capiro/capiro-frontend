"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { LegiWatchTabs } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { BudgetCompare } from "./BudgetCompare";
import {
  BudgetDocuments,
  BudgetProjects,
  BudgetUpdates,
} from "./BudgetEvidence";
import { EvidenceDialogs } from "./EvidenceDialogs";
import { EvidenceScopePicker, useEvidenceScope } from "./EvidenceScope";
import { useEvidenceSelection } from "./use-evidence-selection";

const tabs = [
  { id: "projects", label: "Projects" },
  { id: "documents", label: "Documents & offers" },
  { id: "calendar", label: "Calendar" },
  { id: "updates", label: "Updates" },
];
export function BudgetScreen() {
  const [folderId, setFolderId] = useState("");
  const state = useEvidenceScope(folderId);
  return (
    <div className={styles.form}>
      <EvidenceScopePicker
        value={folderId}
        onChange={setFolderId}
        state={state}
      />
      <BudgetWorkspace key={folderId} scopeState={state} />
    </div>
  );
}
function BudgetWorkspace({
  scopeState,
}: {
  scopeState: ReturnType<typeof useEvidenceScope>;
}) {
  const [view, setView] = useState("projects"),
    [year, setYear] = useState("2026-27"),
    [session, setSession] = useState(scopeState.scope.sessionKey ?? ""),
    [query, setQuery] = useState(""),
    [projectId, setProject] = useState(""),
    [offset, setOffset] = useState(0),
    [compareOpen, setCompareOpen] = useState(false);
  const selection = useEvidenceSelection(),
    route = useLegiWatchRoute(),
    scope = { ...scopeState.scope, sessionKey: session };
  const budget = useCapiroQuery(
    "legiwatch.evidence.budget",
    {
      query: {
        ...scope,
        fiscalYear: year,
        q: query,
        ...(projectId ? { projectId } : {}),
        offset,
      },
    },
    { enabled: /^20\d{2}-\d{2}$/.test(year) && view !== "calendar" },
  );
  const clear = () => {
    selection.reset();
    setProject("");
    setOffset(0);
    setCompareOpen(false);
  };
  return (
    <div className={styles.form}>
      <LegiWatchTabs
        value={view}
        items={tabs}
        onChange={(next) => {
          selection.reset();
          setCompareOpen(false);
          setView(next);
        }}
        label="Florida budget views"
      />
      <BudgetFilters
        year={year}
        session={session}
        query={query}
        onYear={(value) => {
          clear();
          setYear(value);
        }}
        onSession={(value) => {
          clear();
          setSession(value);
        }}
        onQuery={(value) => {
          clear();
          setQuery(value);
        }}
      />
      {view === "calendar" ? (
        <div className={styles.banner}>
          <strong>Calendar handoff</strong>
          <p>
            The Calendar opens legislative Hearings. Project and fiscal-year
            filters do not create a project-specific schedule or recording.
          </p>
          <ActionButton
            onClick={() => route.navigate({ lw: "hearings", lwMore: null })}
          >
            Open hearings calendar
          </ActionButton>
        </div>
      ) : (
        <StatusPanel
          loading={budget.loading}
          error={budget.error}
          onRetry={budget.reload}
        >
          {budget.data && (
            <BudgetContent
              view={view}
              data={budget.data}
              selection={selection}
              canSave={scopeState.selected?.canEdit === true}
              projectId={projectId}
              offset={offset}
              onProject={(id) => {
                selection.reset();
                setProject(id);
                setOffset(0);
              }}
              onOffset={setOffset}
              onCompare={() => setCompareOpen(true)}
            />
          )}
        </StatusPanel>
      )}
      <div className={styles.actions}>
        <ActionButton onClick={() => selection.setBasketOpen(true)}>
          Open local source basket ({selection.refs.length})
        </ActionButton>
        <ActionButton
          disabled={!selection.refs.length}
          onClick={() => selection.setBriefingOpen(true)}
        >
          Include in briefing
        </ActionButton>
      </div>
      <EvidenceDialogs
        selection={selection}
        scope={scope}
        reload={budget.reload}
      />
      {compareOpen && budget.data && (
        <BudgetCompare
          amounts={budget.data.amounts}
          scope={scope}
          onClose={() => setCompareOpen(false)}
          onSource={(id) => {
            setCompareOpen(false);
            selection.setExact({ kind: "budget", id });
          }}
        />
      )}
    </div>
  );
}
function BudgetFilters({
  year,
  session,
  query,
  onYear,
  onSession,
  onQuery,
}: {
  year: string;
  session: string;
  query: string;
  onYear: (value: string) => void;
  onSession: (value: string) => void;
  onQuery: (value: string) => void;
}) {
  return (
    <div className={styles.filters}>
      <Field label="Fiscal year" htmlFor="budget-year">
        <TextInput
          id="budget-year"
          value={year}
          maxLength={7}
          placeholder="2026-27"
          onChange={(event) => onYear(event.target.value)}
        />
        {!/^20\d{2}-\d{2}$/.test(year) && (
          <p role="alert">Enter a fiscal year such as 2026-27.</p>
        )}
      </Field>
      <Field label="Session" htmlFor="budget-session">
        <TextInput
          id="budget-session"
          value={session}
          maxLength={60}
          placeholder="All retained sessions"
          onChange={(event) => onSession(event.target.value)}
        />
      </Field>
      <Field label="Search project / request" htmlFor="budget-query">
        <TextInput
          id="budget-query"
          value={query}
          maxLength={200}
          placeholder="Search title or request identity…"
          onChange={(event) => onQuery(event.target.value)}
        />
      </Field>
    </div>
  );
}
type ContentProps = {
  view: string;
  data: NonNullable<
    ReturnType<typeof useCapiroQuery<"legiwatch.evidence.budget">>["data"]
  >;
  selection: ReturnType<typeof useEvidenceSelection>;
  canSave: boolean;
  projectId: string;
  offset: number;
  onProject: (id: string) => void;
  onOffset: (offset: number) => void;
  onCompare: () => void;
};
function BudgetContent({
  view,
  data,
  selection,
  canSave,
  projectId,
  offset,
  onProject,
  onOffset,
  onCompare,
}: ContentProps) {
  if (view === "documents")
    return (
      <BudgetDocuments
        data={data}
        onSource={(id) => selection.setExact({ kind: "budget", id })}
      />
    );
  if (view === "updates") return <BudgetUpdates data={data} />;
  return (
    <>
      {projectId && (
        <ActionButton onClick={() => onProject("")}>
          All project requests
        </ActionButton>
      )}
      <BudgetProjects
        data={data}
        selection={selection}
        canSave={canSave}
        onProject={onProject}
        onCompare={onCompare}
      />
      <div className={styles.pagination}>
        <span>
          {data.projects.length
            ? `Retained projects ${offset + 1}–${offset + data.projects.length}`
            : "No retained projects on this page"}
        </span>
        <div className={styles.actions}>
          <ActionButton
            disabled={!offset}
            onClick={() => onOffset(Math.max(0, offset - 100))}
          >
            Previous
          </ActionButton>
          <ActionButton
            disabled={data.nextOffset === null}
            onClick={() => onOffset(data.nextOffset!)}
          >
            Next
          </ActionButton>
        </div>
      </div>
    </>
  );
}
