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
import { ImportReview } from "./ImportReview";
import { ImportUpload } from "./ImportUpload";
export function ImportScreen() {
  const members = useCapiroQuery("legiwatch.folder.members", {});
  return (
    <StatusPanel
      loading={members.loading}
      error={members.error}
      onRetry={members.reload}
    >
      {members.data &&
        (members.data.canAssignOwner ? (
          <AuthorizedImports />
        ) : (
          <p className={styles.banner}>
            Import review is available to workspace administrators. Existing
            rules and saved reports remain available in their views.
          </p>
        ))}
    </StatusPanel>
  );
}
function AuthorizedImports() {
  const query = useCapiroQuery("legiwatch.imports", {}),
    [selected, setSelected] = useState<string>();
  const identity = useCapiroQuery("me.read", {});
  if (selected)
    return (
      <ImportReview
        id={selected}
        tenantId={identity.data?.tenant.id}
        onBack={() => {
          setSelected(undefined);
          query.reload();
        }}
      />
    );
  return (
    <div className={styles.form} data-figma-node="923:179341">
      <p className={styles.banner}>
        Preview source evidence and mappings before applying selected records.
        Imports preserve local edits and manual removals. Applying records does
        not activate alerts or provision users.
      </p>
      <ImportUpload
        tenantId={identity.data?.tenant.id}
        onReviewed={setSelected}
      />
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.map((run) => (
          <Panel
            key={run.id}
            title={run.sourceAccount}
            description={`${run.captureId} · ${run.createdAt}`}
            actions={<Badge>{run.status}</Badge>}
          >
            <ActionButton onClick={() => setSelected(run.id)}>
              Review reconciliation
            </ActionButton>
          </Panel>
        ))}
      </StatusPanel>
    </div>
  );
}
