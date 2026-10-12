"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { WorkflowActionView } from "./WorkflowActionView";
import { WorkflowEditor } from "./WorkflowEditor";
import { WorkflowPreview } from "./WorkflowPreview";

export function InternalWorkflows() {
  const folders = useCapiroQuery("legiwatch.folders", {}),
    [folderId, setFolder] = useState("");
  const folder = folders.data?.find((row) => row.id === folderId);
  return (
    <div className={styles.form}>
      <p className={styles.banner}>
        Internal follow-ups create private preparation drafts or owner review
        items. Review scope before activating future triggers. Delivery requires
        its own review.
      </p>
      <StatusPanel
        loading={folders.loading}
        error={folders.error}
        onRetry={folders.reload}
      >
        <SelectField
          id="workflow-folder"
          label="Workflow folder"
          value={folderId}
          onChange={setFolder}
        >
          <option value="">Choose a folder</option>
          {folders.data
            ?.filter((row) => !row.archived)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.jurisdiction} {row.defaultSession}
              </option>
            ))}
        </SelectField>
      </StatusPanel>
      {folder && (
        <WorkflowScope
          key={folder.id}
          folderId={folder.id}
          jurisdiction={folder.jurisdiction}
          sessionKey={folder.defaultSession}
          canEdit={folder.canEdit}
        />
      )}
    </div>
  );
}
function WorkflowScope({
  folderId,
  jurisdiction,
  sessionKey,
  canEdit,
}: {
  folderId: string;
  jurisdiction: string;
  sessionKey: string;
  canEdit: boolean;
}) {
  const definitions = useCapiroQuery("legiwatch.workflows", {
    params: { folderId },
  });
  const history = useCapiroQuery("legiwatch.workflow.history", {
    params: { folderId },
  });
  const [editor, setEditor] = useState<string>(),
    [preview, setPreview] = useState(false),
    [actionId, setAction] = useState<string>();
  const current = definitions.data?.find((row) => row.id === editor),
    scope = { folderIds: [folderId], jurisdiction, sessionKey };
  if (actionId)
    return (
      <WorkflowActionView
        id={actionId}
        onBack={() => {
          setAction(undefined);
          history.reload();
        }}
      />
    );
  return (
    <div className={styles.form}>
      <div className={styles.actions}>
        <ActionButton
          primary
          disabled={!canEdit}
          onClick={() => setEditor("new")}
        >
          Create internal workflow
        </ActionButton>
        <ActionButton onClick={() => setPreview(true)}>
          Preview a follow-up
        </ActionButton>
      </div>
      <StatusPanel
        loading={definitions.loading}
        error={definitions.error}
        onRetry={definitions.reload}
      >
        {definitions.data?.length === 0 && (
          <p>No saved workflows in this folder.</p>
        )}
        {definitions.data?.map((row) => (
          <Panel
            key={row.id}
            title={row.name}
            actions={<Badge>{row.state}</Badge>}
          >
            <p>
              {row.template.replaceAll("_", " ")} · Version {row.version}
            </p>
            <ActionButton onClick={() => setEditor(row.id)}>
              Review workflow
            </ActionButton>
          </Panel>
        ))}
      </StatusPanel>
      <Panel
        title="Action history"
        actions={
          <ActionButton onClick={history.reload}>Refresh history</ActionButton>
        }
      >
        <StatusPanel
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
        >
          {history.data?.length === 0 && <p>No internal actions yet.</p>}
          {history.data?.map((row) => (
            <div className={styles.row} key={row.id}>
              <div>
                <strong>{row.template.replaceAll("_", " ")}</strong>
                <p>
                  {row.state}
                  {row.reason ? ` · ${row.reason}` : ""}
                </p>
              </div>
              <ActionButton onClick={() => setAction(row.id)}>
                Inspect action
              </ActionButton>
            </div>
          ))}
        </StatusPanel>
      </Panel>
      {(current || editor === "new") && (
        <WorkflowEditor
          key={current ? `${current.id}:${current.version}` : "new"}
          row={current}
          scope={scope}
          canEdit={canEdit}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined);
            definitions.reload();
          }}
        />
      )}
      {preview && (
        <WorkflowPreview
          scope={scope}
          onClose={() => setPreview(false)}
          onCreated={(id) => {
            setPreview(false);
            setAction(id);
          }}
        />
      )}
    </div>
  );
}
