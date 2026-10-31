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
import { RecordRuleEditor } from "./RecordRuleEditor";
export type RecordFamily = "record" | "agenda";
export function RecordRules({ family }: { family: RecordFamily }) {
  const query = useCapiroQuery(
      family === "agenda" ? "legiwatch.rules.agenda" : "legiwatch.rules.record",
      {},
    ),
    members = useCapiroQuery("legiwatch.folder.members", {});
  const [selected, setSelected] = useState<string | null>(null);
  const row = query.data?.find((rule) => rule.id === selected);
  return (
    <div className={styles.form} data-figma-node="923:178916">
      <p className={styles.banner}>
        Changes pause the saved rule for review. Activation establishes a new
        baseline after current folder access, staff destinations and source
        coverage are checked.
      </p>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.length === 0 && (
          <p>
            No saved {family === "agenda" ? "agenda" : "bill record"} rules are
            available.
          </p>
        )}
        {query.data?.map((rule) => (
          <Panel
            key={rule.id}
            title={rule.name}
            actions={<Badge>{rule.state.replaceAll("_", " ")}</Badge>}
          >
            <p>
              {rule.folderIds.length} folders ·{" "}
              {rule.cadence.replaceAll("_", " ")}
            </p>
            {rule.issues.map((issue) => (
              <p key={issue} className={styles.gap}>
                {issue}
              </p>
            ))}
            <ActionButton onClick={() => setSelected(rule.id)}>
              Review rule
            </ActionButton>
          </Panel>
        ))}
      </StatusPanel>
      {row && (
        <RecordRuleEditor
          key={`${row.id}:${row.version}`}
          rule={row}
          family={family}
          canEdit={row.ownerClerkId === members.data?.currentActor}
          onClose={() => setSelected(null)}
          onSaved={query.reload}
        />
      )}
    </div>
  );
}
