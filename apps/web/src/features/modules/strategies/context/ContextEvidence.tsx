"use client";

import { useState } from "react";
import type {
  StrategyContextConflict,
  StrategyContextFact,
} from "../../../../shared/capiro/operations/strategies-context";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Field,
  Modal,
  Panel,
  StatusPanel,
  TextArea,
} from "../../../../shared/module-ui";
import styles from "../strategies.module.css";

function ConflictDecision({
  conflict,
  onClose,
  onSaved,
}: {
  conflict: StrategyContextConflict;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [controlling, setControlling] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"resolve" | "dismiss">();
  const resolve = useCapiroMutation("strategies.context.conflict.resolve");
  const dismiss = useCapiroMutation("strategies.context.conflict.dismiss");
  const pending = resolve.pending || dismiss.pending;
  async function apply() {
    try {
      if (confirm === "resolve")
        await resolve.run({
          params: { id: conflict.id },
          body: { note, controllingFactId: controlling || undefined },
        });
      else await dismiss.run({ params: { id: conflict.id } });
      onSaved();
      onClose();
    } catch {
      /* Actual evidence outcomes remain service-owned. */
    }
  }
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !pending) onClose();
        }}
        title="Resolve conflicting information"
        description="Choose which source controls and record your reason."
        footer={
          <>
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <ActionButton
              disabled={!note.trim()}
              onClick={() => setConfirm("resolve")}
            >
              Resolve conflict
            </ActionButton>
            <ActionButton onClick={() => setConfirm("dismiss")}>
              Dismiss conflict
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          {[
            ["A", conflict.factAId, conflict.factA],
            ["B", conflict.factBId, conflict.factB],
          ].map(([label, id, side]) => {
            const fact = side as StrategyContextConflict["factA"];
            return (
              <Panel key={String(label)} title={`Source ${label}`}>
                <label className={styles.check}>
                  <input
                    type="radio"
                    name="controlling-fact"
                    value={String(id)}
                    checked={controlling === id}
                    onChange={() => setControlling(String(id))}
                  />
                  <span>
                    {fact?.fact ?? "Source fact unavailable"}
                    <small>
                      {fact?.documentTitle} ·{" "}
                      {fact?.authority ?? "Authority not recorded"} ·{" "}
                      {fact?.asOf ?? "Date not recorded"}
                    </small>
                  </span>
                </label>
              </Panel>
            );
          })}
          <Field
            label="Evidence decision reason *"
            htmlFor="conflict-resolution-reason"
          >
            <TextArea
              id="conflict-resolution-reason"
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirm(undefined);
        }}
        title="Confirm evidence decision"
        description={
          confirm === "resolve"
            ? "The other fact is rejected when a controlling fact is selected."
            : "Dismissal leaves both facts in use."
        }
        footer={
          <>
            <ActionButton
              disabled={pending}
              onClick={() => setConfirm(undefined)}
            >
              Back
            </ActionButton>
            <ActionButton primary disabled={pending} onClick={apply}>
              Confirm decision
            </ActionButton>
          </>
        }
      >
        <p>{note || "Dismiss as nonmaterial after review"}</p>
        {(resolve.error || dismiss.error) && (
          <p role="alert" className={styles.error}>
            {(resolve.error ?? dismiss.error)?.message}
          </p>
        )}
      </Modal>
    </>
  );
}

export function ContextEvidence({
  clientId,
  onClose,
}: {
  clientId?: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [conflict, setConflict] = useState<StrategyContextConflict>();
  const [fact, setFact] = useState<StrategyContextFact>();
  const facts = useCapiroQuery("strategies.context.facts", {
    query: { clientId },
  });
  const conflicts = useCapiroQuery("strategies.context.conflicts", {
    query: { clientId, state: openOnly ? "open" : undefined },
  });
  const health = useCapiroQuery("strategies.context.health", {
    query: { clientId },
  });
  const reject = useCapiroMutation("strategies.context.fact.reject");
  async function rejectFact() {
    if (!fact) return;
    try {
      await reject.run({ params: { id: fact.id } });
      setFact(undefined);
      facts.reload();
    } catch {
      /* Do not remove a fact until the server acknowledges rejection. */
    }
  }
  return (
    <div className={styles.panels}>
      <div className={styles.actions}>
        <ActionButton onClick={onClose}>← Context library</ActionButton>
        <h1>Facts and conflicts</h1>
      </div>
      <div className={styles.plum}>
        <h2>Context health</h2>
        <StatusPanel
          loading={health.loading}
          error={health.error}
          onRetry={health.reload}
        >
          {health.data && (
            <p>
              {health.data.missingRequired.length} required context gaps ·{" "}
              {health.data.staleDocs.length} stale sources ·{" "}
              {health.data.openConflicts} open conflicts
            </p>
          )}
        </StatusPanel>
      </div>
      <Panel title="Conflicts">
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(event) => setOpenOnly(event.target.checked)}
          />
          Open only
        </label>
        <StatusPanel
          loading={conflicts.loading}
          error={conflicts.error}
          onRetry={conflicts.reload}
        >
          <DataTable
            rows={conflicts.data ?? []}
            rowKey={(row) => row.id}
            caption="Context conflicts"
            columns={[
              {
                key: "facts",
                label: "FACTS",
                render: (row) => (
                  <span>
                    {row.factA?.fact ?? "Source unavailable"}
                    <span className={styles.secondary}>
                      versus {row.factB?.fact ?? "Source unavailable"}
                    </span>
                  </span>
                ),
              },
              {
                key: "state",
                label: "STATE",
                render: (row) =>
                  `${row.state}${row.material ? " · Material" : ""}`,
              },
              {
                key: "action",
                label: "ACTION",
                render: (row) => (
                  <ActionButton
                    disabled={row.state !== "open"}
                    onClick={() => setConflict(row)}
                  >
                    Resolve conflict
                  </ActionButton>
                ),
              },
            ]}
          />
        </StatusPanel>
      </Panel>
      <Panel title="Fact ledger">
        <Field label="Search facts" htmlFor="context-fact-search">
          <TextArea
            id="context-fact-search"
            value={search}
            placeholder="Search statements or sources"
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <StatusPanel
          loading={facts.loading}
          error={facts.error}
          onRetry={facts.reload}
        >
          <DataTable
            rows={(facts.data ?? []).filter((row) =>
              `${row.fact} ${row.document?.title ?? ""}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )}
            rowKey={(row) => row.id}
            caption="Context fact ledger"
            columns={[
              { key: "fact", label: "FACT", render: (row) => row.fact },
              {
                key: "source",
                label: "SOURCE",
                render: (row) =>
                  `${row.document?.title ?? "Document"} · ${row.sourceRef}`,
              },
              { key: "state", label: "STATE", render: (row) => row.state },
              {
                key: "action",
                label: "REVIEW",
                render: (row) => (
                  <ActionButton onClick={() => setFact(row)}>
                    Review fact
                  </ActionButton>
                ),
              },
            ]}
          />
        </StatusPanel>
      </Panel>
      {conflict && (
        <ConflictDecision
          conflict={conflict}
          onClose={() => setConflict(undefined)}
          onSaved={() => {
            conflicts.reload();
            facts.reload();
            health.reload();
          }}
        />
      )}
      <Modal
        open={Boolean(fact)}
        onOpenChange={(open) => {
          if (!open && !reject.pending) setFact(undefined);
        }}
        title="Review evidence fact"
        footer={
          <>
            <ActionButton onClick={() => setFact(undefined)}>
              Close
            </ActionButton>
            <ActionButton
              primary
              disabled={reject.pending || fact?.state !== "active"}
              onClick={rejectFact}
            >
              Reject fact
            </ActionButton>
          </>
        }
      >
        <p>{fact?.fact}</p>
        <p className={styles.muted}>
          {fact?.citation ?? "No source quotation recorded."}
        </p>
        <p className={styles.muted}>
          {fact?.authority} · {fact?.sourceRef}
        </p>
        {reject.error && (
          <p role="alert" className={styles.error}>
            {reject.error.message}
          </p>
        )}
      </Modal>
    </div>
  );
}
