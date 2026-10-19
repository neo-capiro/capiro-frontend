"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { LegiWatchTabs, SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { EvidenceBasketActions } from "./EvidenceBasket";
import { EvidenceDialogs } from "./EvidenceDialogs";
import { EvidenceScopePicker, useEvidenceScope } from "./EvidenceScope";
import { NewsCoverage } from "./NewsCoverage";
import { NewsMonitors } from "./NewsMonitors";
import { PersonnelEvidence } from "./PersonnelEvidence";
import { useEvidenceSelection } from "./use-evidence-selection";

const tabs = [
  { id: "coverage", label: "Coverage" },
  { id: "monitors", label: "Monitors & import" },
  { id: "personnel", label: "Personnel changes" },
  { id: "registrations", label: "Registrations" },
];
export function NewsScreen() {
  const [folderId, setFolderId] = useState("");
  const state = useEvidenceScope(folderId);
  return (
    <div className={styles.form}>
      <EvidenceScopePicker
        value={folderId}
        onChange={setFolderId}
        state={state}
      />
      {folderId && !state.selected ? (
        <StatusPanel
          loading={state.folders.loading}
          error={
            state.folders.error ?? "The selected folder is no longer available."
          }
        />
      ) : (
        <NewsWorkspace key={folderId} scopeState={state} />
      )}
    </div>
  );
}
function NewsWorkspace({
  scopeState,
}: {
  scopeState: ReturnType<typeof useEvidenceScope>;
}) {
  const [view, setView] = useState("coverage"),
    [q, setQuery] = useState(""),
    [publisher, setPublisher] = useState(""),
    [days, setDays] = useState<1 | 3 | 7 | 14>(7),
    [offset, setOffset] = useState(0),
    [personnelRevision, setPersonnelRevision] = useState(0);
  const selection = useEvidenceSelection(),
    scope = scopeState.scope;
  const news = useCapiroQuery(
    "legiwatch.evidence.news",
    { query: { ...scope, q, publisher, days, offset, limit: 50 } },
    { enabled: view === "coverage" },
  );
  return (
    <div className={styles.form}>
      <LegiWatchTabs
        value={view}
        items={tabs}
        onChange={(next) => {
          selection.reset();
          setView(next);
        }}
        label="News evidence views"
      />
      {view === "coverage" && (
        <>
          <NewsFilters
            q={q}
            publisher={publisher}
            days={days}
            onQuery={(value) => {
              setQuery(value);
              setOffset(0);
            }}
            onPublisher={(value) => {
              setPublisher(value);
              setOffset(0);
            }}
            onDays={(value) => {
              setDays(value);
              setOffset(0);
            }}
          />
          <NewsCoverageSection
            news={news}
            selection={selection}
            canSave={scopeState.selected?.canEdit === true}
            offset={offset}
            onOffset={setOffset}
          />
        </>
      )}
      {view === "monitors" && <NewsMonitors scope={scope} />}
      {(view === "personnel" || view === "registrations") && (
        <PersonnelEvidence
          key={`${view}:${personnelRevision}`}
          kind={view === "personnel" ? "change" : "registration"}
          scope={scope}
          selection={selection}
          canSave={scopeState.selected?.canEdit === true}
        />
      )}
      <EvidenceBasketActions selection={selection} />
      <p className={styles.banner}>
        The local source basket is temporary. Open an exact source to select its
        retained revision; preparing a briefing is a separate review step.
      </p>
      <EvidenceDialogs
        selection={selection}
        scope={scope}
        reload={() => {
          news.reload();
          setPersonnelRevision((revision) => revision + 1);
        }}
      />
    </div>
  );
}
function NewsCoverageSection({
  news,
  selection,
  canSave,
  offset,
  onOffset,
}: {
  news: ReturnType<typeof useCapiroQuery<"legiwatch.evidence.news">>;
  selection: ReturnType<typeof useEvidenceSelection>;
  canSave: boolean;
  offset: number;
  onOffset: (value: number) => void;
}) {
  return (
    <StatusPanel
      loading={news.loading}
      error={news.error}
      onRetry={news.reload}
    >
      {news.data && (
        <>
          <NewsCoverage
            data={news.data}
            selection={selection}
            canSave={canSave}
          />
          <div className={styles.pagination}>
            <span>
              {news.data.items.length
                ? `Retained articles ${offset + 1}–${offset + news.data.items.length}`
                : "No retained articles on this page"}
            </span>
            <div className={styles.actions}>
              <ActionButton
                disabled={!offset}
                onClick={() => onOffset(Math.max(0, offset - 50))}
              >
                Previous
              </ActionButton>
              <ActionButton
                disabled={news.data.nextOffset === null}
                onClick={() => onOffset(news.data!.nextOffset!)}
              >
                Next
              </ActionButton>
            </div>
          </div>
        </>
      )}
    </StatusPanel>
  );
}
function NewsFilters({
  q,
  publisher,
  days,
  onQuery,
  onPublisher,
  onDays,
}: {
  q: string;
  publisher: string;
  days: number;
  onQuery: (value: string) => void;
  onPublisher: (value: string) => void;
  onDays: (value: 1 | 3 | 7 | 14) => void;
}) {
  return (
    <div className={styles.filters}>
      <Field label="Search retained sources" htmlFor="news-query">
        <TextInput
          id="news-query"
          value={q}
          maxLength={500}
          onChange={(event) => onQuery(event.target.value)}
        />
      </Field>
      <SelectField
        id="news-window"
        label="Window"
        value={String(days)}
        onChange={(value) => {
          const day = Number(value);
          if (day === 1 || day === 3 || day === 7 || day === 14) onDays(day);
        }}
      >
        {[1, 3, 7, 14].map((day) => (
          <option key={day} value={day}>
            {day} {day === 1 ? "day" : "days"}
          </option>
        ))}
      </SelectField>
      <Field label="Publisher" htmlFor="news-publisher">
        <TextInput
          id="news-publisher"
          value={publisher}
          placeholder="All publishers"
          maxLength={200}
          onChange={(event) => onPublisher(event.target.value)}
        />
      </Field>
    </div>
  );
}
