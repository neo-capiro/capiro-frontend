"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { KeywordEditor } from "./KeywordEditor";
export function KeywordRules() {
  const query = useCapiroQuery("legiwatch.keywords", {}),
    [selected, setSelected] = useState<string>();
  const row = query.data?.find((item) => item.id === selected);
  return (
    <div className={styles.form} data-figma-node="923:179514">
      <ActionButton primary onClick={() => setSelected("new")}>
        New keyword rule
      </ActionButton>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.length === 0 && (
          <p>No keyword discovery rules have been saved.</p>
        )}
        {query.data?.map((rule) => (
          <Panel
            key={rule.id}
            title={rule.name}
            actions={<Badge>{rule.state.replaceAll("_", " ")}</Badge>}
          >
            <p>
              {rule.config.scope.jurisdiction} · {rule.config.scope.sessionKey}{" "}
              · {rule.config.definitions.length} definitions ·{" "}
              {rule.config.mode.replaceAll("_", " ")}
            </p>
            {rule.issues?.map((issue) => (
              <p key={issue} className={styles.gap}>
                {issue}
              </p>
            ))}
            <ActionButton onClick={() => setSelected(rule.id)}>
              Review keyword rule
            </ActionButton>
          </Panel>
        ))}
      </StatusPanel>
      {(selected === "new" || row) && (
        <KeywordEditor
          key={row ? `${row.id}:${row.version}` : "new"}
          row={row}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            query.reload();
          }}
        />
      )}
    </div>
  );
}
