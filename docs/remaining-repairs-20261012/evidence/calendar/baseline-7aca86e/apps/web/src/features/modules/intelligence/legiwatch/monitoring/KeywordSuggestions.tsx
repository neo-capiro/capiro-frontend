"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import type {
  keywordRule,
  keywordSuggestion,
} from "../../../../../shared/capiro/operations/legiwatch-keyword-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField, SourceLink } from "../components";
import styles from "../legiwatch.module.css";
export function KeywordSuggestions({
  rule,
}: {
  rule: z.infer<typeof keywordRule>;
}) {
  const [folderId, setFolder] = useState(rule.config.folderIds[0] ?? ""),
    [cursor, setCursor] = useState<string>();
  const query = useCapiroQuery(
    "legiwatch.keyword.suggestions",
    {
      params: { id: folderId || "unselected" },
      query: {
        jurisdiction: rule.config.scope.jurisdiction,
        sessionKey: rule.config.scope.sessionKey,
        cursor,
      },
    },
    { enabled: Boolean(folderId) },
  );
  const folders = useCapiroQuery("legiwatch.folders", {});
  return (
    <div className={styles.form}>
      <SelectField
        id="keyword-suggestion-folder"
        label="Folder"
        value={folderId}
        onChange={(value) => {
          setFolder(value);
          setCursor(undefined);
        }}
      >
        <option value="">Choose a folder</option>
        {rule.config.folderIds.map((id) => (
          <option value={id} key={id}>
            {folders.data?.find((folder) => folder.id === id)?.name ?? id}
          </option>
        ))}
      </SelectField>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.rows.length === 0 && (
          <p>No suggestions in this folder and session.</p>
        )}
        {query.data?.rows.map((row) => (
          <SuggestionDecision
            key={`${row.id}:${row.version}`}
            row={row}
            onChanged={query.reload}
          />
        ))}
      </StatusPanel>
      <div className={styles.actions}>
        <ActionButton disabled={!cursor} onClick={() => setCursor(undefined)}>
          First page
        </ActionButton>
        <ActionButton
          disabled={!query.data?.next}
          onClick={() => setCursor(query.data!.next!)}
        >
          Next suggestions
        </ActionButton>
      </div>
    </div>
  );
}
function SuggestionDecision({
  row,
  onChanged,
}: {
  row: z.infer<typeof keywordSuggestion>;
  onChanged: () => void;
}) {
  const mutation = useCapiroMutation("legiwatch.keyword.decision"),
    keys = useRef(new Map<string, string>());
  const act = async (
    action: "add" | "dismiss" | "exclude" | "restore" | "undo",
  ) => {
    const key = keys.current.get(action) ?? crypto.randomUUID();
    keys.current.set(action, key);
    try {
      await mutation.run({
        params: { id: row.id },
        body: { action, expectedVersion: row.version, requestKey: key },
      });
      onChanged();
    } catch {
      /* Preserve exact decision identity for a retry. */
    }
  };
  return (
    <Panel
      title={`${row.payload.bill.number} · ${row.payload.bill.title}`}
      actions={<Badge>{row.state}</Badge>}
    >
      <p>{row.payload.explanation ?? `${row.payload.origin} suggestion`}</p>
      {row.payload.coverage.missing.map((gap) => (
        <p key={gap} className={styles.gap}>
          {gap}
        </p>
      ))}
      <SourceLink href={row.payload.bill.sourceUrl}>
        Official bill source
      </SourceLink>
      <div className={styles.actions}>
        {row.state === "pending" && (
          <>
            <ActionButton
              primary
              disabled={mutation.pending || !row.payload.coverage.complete}
              onClick={() => void act("add")}
            >
              Add reviewed bill to folder
            </ActionButton>
            <ActionButton
              disabled={mutation.pending}
              onClick={() => void act("dismiss")}
            >
              Dismiss suggestion
            </ActionButton>
          </>
        )}
        {row.state === "excluded" ? (
          <ActionButton
            disabled={mutation.pending}
            onClick={() => void act("restore")}
          >
            Restore rule eligibility
          </ActionButton>
        ) : (
          <ActionButton
            disabled={mutation.pending}
            onClick={() => void act("exclude")}
          >
            Exclude from this rule
          </ActionButton>
        )}
        {["added", "already_present"].includes(row.state) && (
          <ActionButton
            disabled={mutation.pending}
            onClick={() => void act("undo")}
          >
            Undo this assignment decision
          </ActionButton>
        )}
      </div>
      {mutation.data && <p role="status">Decision: {mutation.data.outcome}</p>}
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </Panel>
  );
}
