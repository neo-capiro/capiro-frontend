"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { EngagementTask } from "../../../shared/capiro/operations/engagement";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./engagement.module.css";
export function CommitmentView({ clientId }: { clientId: string }) {
  const api = useCapiro();
  const query = useCapiroQuery("engagement.tasks", {
    query: { clientId: clientId || undefined },
  });
  const [status, setStatus] = useState("open"),
    [selected, setSelected] = useState<EngagementTask | "new" | null>(null),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const rows =
    query.data?.filter(
      (task) =>
        status === "all" ||
        (status === "open"
          ? !["done", "canceled"].includes(task.status)
          : task.status === status),
    ) ?? [];
  const complete = async (task: EngagementTask) => {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("engagement.task.update", {
        params: { id: task.id },
        body: { status: task.status === "done" ? "todo" : "done" },
      });
      query.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update commitment.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.stack}>
      <div className={styles.tools}>
        <select
          className={styles.select}
          aria-label="Commitment status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="open">Open commitments</option>
          <option value="all">All commitments</option>
          <option value="done">Completed</option>
        </select>
        <ActionButton
          primary
          className={styles.end}
          onClick={() => setSelected("new")}
        >
          + New commitment
        </ActionButton>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <CommitmentTable
          rows={rows}
          busy={busy}
          onEdit={setSelected}
          onComplete={complete}
        />
      </StatusPanel>
      <Modal
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected === "new" ? "New commitment" : "Edit commitment"}
        description="The service preserves the task's client and meeting associations."
      >
        {selected && (
          <CommitmentForm
            key={typeof selected === "object" ? selected.id : "new"}
            task={typeof selected === "object" ? selected : undefined}
            clientId={clientId}
            onClose={() => setSelected(null)}
            onSaved={query.reload}
          />
        )}
      </Modal>
    </div>
  );
}
function CommitmentForm({
  task,
  clientId,
  onClose,
  onSaved,
}: {
  task?: EngagementTask;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useCapiro();
  const [title, setTitle] = useState(task?.title ?? ""),
    [description, setDescription] = useState(task?.description ?? ""),
    [due, setDue] = useState(task?.dueDate?.slice(0, 10) ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const body = {
        title,
        description,
        ...(due ? { dueDate: new Date(`${due}T12:00:00`).toISOString() } : {}),
      };
      if (task)
        await api.request("engagement.task.update", {
          params: { id: task.id },
          body: { ...body, dueDate: due ? body.dueDate : null },
        });
      else
        await api.request("engagement.task.create", {
          body: { ...body, ...(clientId ? { clientId } : {}) },
        });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save commitment.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={styles.stack} onSubmit={(event) => void submit(event)}>
      <Field label="Title" htmlFor="commitment-title">
        <TextInput
          id="commitment-title"
          required
          maxLength={240}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label="Description" htmlFor="commitment-description">
        <TextArea
          id="commitment-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label="Due date" htmlFor="commitment-due">
        <TextInput
          type="date"
          id="commitment-due"
          value={due}
          onChange={(event) => setDue(event.target.value)}
        />
      </Field>
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
          Save commitment
        </ActionButton>
      </div>
    </form>
  );
}

function CommitmentTable({
  rows,
  busy,
  onEdit: setSelected,
  onComplete: complete,
}: {
  rows: EngagementTask[];
  busy: boolean;
  onEdit: (task: EngagementTask) => void;
  onComplete: (task: EngagementTask) => Promise<void>;
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      caption="Commitments and follow-ups"
      columns={[
        {
          key: "task",
          label: "Commitment",
          render: (row) => (
            <button className={styles.name} onClick={() => setSelected(row)}>
              {row.title}
            </button>
          ),
        },
        {
          key: "client",
          label: "Client",
          render: (row) => row.client?.name ?? "Unassigned",
        },
        {
          key: "due",
          label: "Due",
          render: (row) =>
            row.dueDate
              ? new Date(row.dueDate).toLocaleDateString()
              : "No due date",
        },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <Badge
              tone={
                row.status === "done"
                  ? "success"
                  : row.status === "blocked"
                    ? "danger"
                    : "neutral"
              }
            >
              {row.status.replaceAll("_", " ")}
            </Badge>
          ),
        },
        {
          key: "action",
          label: "Action",
          render: (row) => (
            <ActionButton disabled={busy} onClick={() => void complete(row)}>
              {row.status === "done" ? "Reopen" : "Complete"}
            </ActionButton>
          ),
        },
      ]}
    />
  );
}
