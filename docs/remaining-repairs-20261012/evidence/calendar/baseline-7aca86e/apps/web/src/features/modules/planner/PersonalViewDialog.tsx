"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { resourcePatchSchema } from "../../../shared/capiro/operations/planner-resource-data";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
import type { TaskView } from "./task-presentation";
type Props = {
  open: boolean;
  kind: "my_tasks" | "saved_view";
  view: TaskView;
  mine: boolean;
  projectId: string | null;
  filters: {
    search: string;
    status: string;
    assigneeId: string;
    priority: string;
  };
  onClose: () => void;
};
export function PersonalViewDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={props.kind === "my_tasks" ? "My tasks settings" : "Save view"}
      description={
        props.kind === "my_tasks"
          ? "Sections and ordering remain private to you."
          : "Save the current display and filters."
      }
    >
      {props.open && <PersonalViewForm {...props} />}
    </Modal>
  );
}
function PersonalViewForm({
  kind,
  view,
  mine,
  projectId,
  filters,
  onClose,
}: Props) {
  const api = useCapiro();
  const query = useCapiroQuery("planner.resources", {});
  const existing = query.data?.find((item) => item.kind === "my_tasks");
  const [name, setName] = useState(""),
    [sections, setSections] = useState("Today\nUpcoming\nLater"),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const data = resourcePatchSchema.parse(
        kind === "saved_view"
          ? {
              scope: mine ? "mine" : "project",
              projectId,
              view,
              ...filters,
              sort: "position",
              groupBy: "section",
            }
          : {
              ...existing?.data,
              sections: sections
                .split("\n")
                .filter((line) => line.trim())
                .map((label, index) => ({
                  id: Array.isArray(existing?.data.sections)
                    ? ((existing.data.sections[index] as { id?: string })?.id ??
                      crypto.randomUUID())
                    : crypto.randomUUID(),
                  name: label.trim(),
                })),
              placements: existing?.data.placements ?? [],
            },
      );
      if (kind === "my_tasks" && existing)
        await api.request("planner.resource.update", {
          params: { id: existing.id },
          body: { version: existing.version, name: "My tasks", data },
        });
      else
        await api.request("planner.resource.create", {
          body: { kind, name: kind === "my_tasks" ? "My tasks" : name, data },
        });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save settings.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      <form className={styles.stack} onSubmit={(event) => void submit(event)}>
        <PersonalViewFields
          kind={kind}
          name={name}
          setName={setName}
          sections={sections}
          setSections={setSections}
        />
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.footer}>
          <ActionButton type="button" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton primary type="submit" disabled={busy}>
            Save
          </ActionButton>
        </div>
      </form>
    </StatusPanel>
  );
}

function PersonalViewFields({
  kind,
  name,
  setName,
  sections,
  setSections,
}: {
  kind: Props["kind"];
  name: string;
  setName: (name: string) => void;
  sections: string;
  setSections: (sections: string) => void;
}) {
  return (
    <>
      {kind === "saved_view" ? (
        <Field label="View name" htmlFor="saved-view-name">
          <TextInput
            id="saved-view-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={500}
          />
        </Field>
      ) : (
        <Field label="Sections (one per line)" htmlFor="my-task-sections">
          <TextArea
            id="my-task-sections"
            value={sections}
            onChange={(event) => setSections(event.target.value)}
            required
          />
        </Field>
      )}
    </>
  );
}
