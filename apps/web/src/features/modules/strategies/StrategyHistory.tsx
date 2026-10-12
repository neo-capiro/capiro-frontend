"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Modal,
  Panel,
  SelectInput,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./strategies.module.css";

export function StrategyHistory({
  id,
  onClose,
  onRestored,
}: {
  id: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [cursor, setCursor] = useState<string>();
  const [author, setAuthor] = useState("all");
  const [selected, setSelected] = useState("");
  const [restore, setRestore] = useState(false);
  const versions = useCapiroQuery("strategies.versions", {
    params: { id },
    query: { cursor, take: 50 },
  });
  const impact = useCapiroQuery(
    "strategies.version.impact",
    { params: { id, versionId: selected } },
    { enabled: Boolean(selected) },
  );
  const mutation = useCapiroMutation("strategies.version.restore");
  async function apply() {
    try {
      await mutation.run({ params: { id, versionId: selected } });
      onRestored();
      onClose();
    } catch {
      /* A moved plan or revoked permission stays explicit. */
    }
  }
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !mutation.pending) onClose();
        }}
        title="Strategy history"
        description="Compare earlier revisions with the current working plan."
        footer={
          <>
            <ActionButton onClick={onClose}>Close</ActionButton>
            <ActionButton
              primary
              disabled={
                !selected ||
                impact.loading ||
                impact.error !== undefined ||
                impact.data?.noOp
              }
              onClick={() => setRestore(true)}
            >
              Review restore impact
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          <Panel title="Versions">
            <SelectInput
              aria-label="Filter strategy history by author"
              value={author}
              onValueChange={setAuthor}
              options={[
                { value: "all", label: "All authors" },
                { value: "person", label: "People" },
                { value: "meri", label: "Meri revisions" },
              ]}
            />
            <StatusPanel
              loading={versions.loading}
              error={versions.error}
              onRetry={versions.reload}
            >
              <DataTable
                rows={(versions.data?.items ?? []).filter(
                  (version) =>
                    author === "all" || version.authorKind === author,
                )}
                rowKey={(version) => version.id}
                caption="Strategy version history"
                columns={[
                  {
                    key: "selected",
                    label: "VERSION",
                    render: (version) => (
                      <button
                        className={styles.link}
                        onClick={() => setSelected(version.id)}
                        aria-pressed={selected === version.id}
                      >
                        {selected === version.id ? "Selected · " : ""}
                        {version.note ?? "Saved version"}
                      </button>
                    ),
                  },
                  {
                    key: "author",
                    label: "AUTHOR",
                    render: (version) => version.authorKind,
                  },
                  {
                    key: "date",
                    label: "CHANGED",
                    render: (version) =>
                      new Date(version.createdAt).toLocaleString(),
                  },
                ]}
              />
            </StatusPanel>
            <div className={styles.actions}>
              {versions.data?.nextCursor && (
                <ActionButton
                  onClick={() =>
                    setCursor(versions.data?.nextCursor ?? undefined)
                  }
                >
                  Load more versions
                </ActionButton>
              )}
              {cursor && (
                <ActionButton onClick={() => setCursor(undefined)}>
                  Newest versions
                </ActionButton>
              )}
            </div>
          </Panel>
          {selected && (
            <StatusPanel
              loading={impact.loading}
              error={impact.error}
              onRetry={impact.reload}
            >
              {impact.data && (
                <Panel title="Restore impact">
                  <p>
                    {impact.data.nodes.added.length} added ·{" "}
                    {impact.data.nodes.revived.length} revived ·{" "}
                    {impact.data.nodes.changed.length} changed ·{" "}
                    {impact.data.nodes.removed.length} archived
                  </p>
                  {impact.data.nodes.changed.map((node) => (
                    <p key={node.id}>
                      {node.title}
                      <span className={styles.secondary}>
                        {node.changedFields.join(", ")}
                      </span>
                    </p>
                  ))}
                  <p className={styles.muted}>
                    {impact.data.artifacts.workspaceDraftsAffected} Workspace
                    drafts and {impact.data.artifacts.outreachRecordsAffected}{" "}
                    Outreach records become historical. No artifacts are
                    deleted.
                  </p>
                  <p className={styles.muted}>
                    {impact.data.runs.activeCount} active runs reference
                    affected steps.
                  </p>
                  {impact.data.noOp && (
                    <p className={styles.notice}>
                      This saved version already matches the current plan.
                    </p>
                  )}
                </Panel>
              )}
            </StatusPanel>
          )}
        </div>
      </Modal>
      <Modal
        open={restore}
        onOpenChange={setRestore}
        title="Restore as a new version?"
        description="The backend archives omitted steps and retains existing work and audit history."
        footer={
          <>
            <ActionButton
              disabled={mutation.pending}
              onClick={() => setRestore(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton primary disabled={mutation.pending} onClick={apply}>
              {mutation.pending ? "Restoring…" : "Restore version"}
            </ActionButton>
          </>
        }
      >
        <p>
          {impact.data?.nodes.removed.length ?? 0} live steps will be archived.
        </p>
        {mutation.error && (
          <p role="alert" className={styles.error}>
            {mutation.error.message}
          </p>
        )}
      </Modal>
    </>
  );
}
