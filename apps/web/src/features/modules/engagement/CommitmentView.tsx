"use client";
import { useEffect, useRef, useState } from "react";
import type { EngagementTask } from "../../../shared/capiro/operations/engagement";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
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
import { commitmentDueDay, commitmentFields } from "./commitment-fields";
export function CommitmentView({ clientId }: { clientId: string }) {
  return <ScopedCommitments key={clientId} clientId={clientId} />;
}
function ScopedCommitments({ clientId }: { clientId: string }) {
  const completion = useCapiroMutation("engagement.task.update");
  const query = useCapiroQuery("engagement.tasks", {
    query: { clientId: clientId || undefined },
  });
  const [status, setStatus] = useState("open"),
    [selected, setSelected] = useState<EngagementTask | "new" | null>(null),
    [formBusy, setFormBusy] = useState(false);
  const formPending = useRef(false);
  const busy = completion.pending || formBusy;
  const changeFormBusy = (pending: boolean) => {
    formPending.current = pending;
    setFormBusy(pending);
  };
  const rows =
    query.data?.filter(
      (task) =>
        status === "all" ||
        (status === "open"
          ? !["done", "canceled"].includes(task.status)
          : task.status === status),
    ) ?? [];
  const complete = async (task: EngagementTask) => {
    if (busy || formPending.current) return;
    try {
      await completion.run({
        params: { id: task.id },
        body: { status: task.status === "done" ? "todo" : "done" },
      });
      query.reload();
    } catch {
      /* The canonical mutation owner displays the current-scope error. */
    }
  };
  return (
    <div className={styles.stack}>
      <div className={styles.tools}>
        <select
          className={styles.select}
          aria-label="Commitment status"
          value={status}
          disabled={busy}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="open">Open commitments</option>
          <option value="all">All commitments</option>
          <option value="done">Completed</option>
        </select>
        <ActionButton
          primary
          className={styles.end}
          disabled={busy}
          onClick={() => {
            if (!formPending.current && !busy) setSelected("new");
          }}
        >
          + New commitment
        </ActionButton>
      </div>
      {completion.error && (
        <p role="alert" className={styles.error}>
          {completion.error.message}
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
          onEdit={(task) => {
            if (!formPending.current && !busy) setSelected(task);
          }}
          onComplete={complete}
        />
      </StatusPanel>
      <Modal
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !formPending.current) setSelected(null);
        }}
        title={selected === "new" ? "New commitment" : "Edit commitment"}
        description="The service preserves the task's client and meeting associations."
      >
        {selected && (
          <CommitmentForm
            key={typeof selected === "object" ? selected.id : "new"}
            task={typeof selected === "object" ? selected : undefined}
            clientId={clientId}
            onClose={() => {
              if (!formPending.current) setSelected(null);
            }}
            onSaved={() => {
              query.reload();
              setSelected(null);
            }}
            onBusyChange={changeFormBusy}
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
  onBusyChange,
}: {
  task?: EngagementTask;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const mutation = useCapiroMutation(
    task ? "engagement.task.update" : "engagement.task.create",
  );
  const active = useRef(true),
    pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [title, setTitle] = useState(task?.title ?? ""),
    [description, setDescription] = useState(task?.description ?? ""),
    [due, setDue] = useState(commitmentDueDay(task?.dueDate));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    onBusyChange(true);
    try {
      const draft = { title, description, due };
      if (task)
        await mutation.run({
          params: { id: task.id },
          body: commitmentFields(draft, task),
        });
      else
        await mutation.run({
          body: {
            ...commitmentFields(draft),
            ...(clientId ? { clientId } : {}),
          },
        });
      if (active.current) onSaved();
    } catch {
      // The canonical mutation owner retains the current-scope error.
    } finally {
      pending.current = false;
      if (active.current) onBusyChange(false);
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
          disabled={mutation.pending}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label="Description" htmlFor="commitment-description">
        <TextArea
          id="commitment-description"
          value={description}
          disabled={mutation.pending}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label="Due date" htmlFor="commitment-due">
        <TextInput
          type="date"
          id="commitment-due"
          value={due}
          disabled={mutation.pending}
          onChange={(event) => setDue(event.target.value)}
        />
      </Field>
      {mutation.error && (
        <p role="alert" className={styles.error}>
          {mutation.error.message}
        </p>
      )}
      <div className={styles.footer}>
        <ActionButton
          type="button"
          disabled={mutation.pending}
          onClick={onClose}
        >
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={mutation.pending}>
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
            <button
              className={styles.name}
              disabled={busy}
              onClick={() => setSelected(row)}
            >
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
