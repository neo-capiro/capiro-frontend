"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { ImportItem } from "./ImportItem";
export function ImportReview({
  id,
  tenantId,
  onBack,
}: {
  id: string;
  tenantId?: string;
  onBack: () => void;
}) {
  const [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [item, setItem] = useState<string>(),
    [compensating, setCompensating] = useState(false);
  const query = useCapiroQuery("legiwatch.import.review", {
    params: { id },
    query: { offset },
  });
  const apply = useCapiroMutation("legiwatch.import.apply"),
    compensate = useCapiroMutation("legiwatch.import.compensate"),
    pause = useCapiroMutation("legiwatch.import.pause"),
    resume = useCapiroMutation("legiwatch.import.resume");
  const pending =
    apply.pending || compensate.pending || pause.pending || resume.pending;
  const applySelection = async (undo: boolean) => {
    if (!query.data || !tenantId) return;
    try {
      const body = {
        targetTenantId: tenantId,
        mappingHash: query.data.run.mappingHash,
        itemIds: selected,
      };
      if (undo) await compensate.run({ params: { id }, body });
      else await apply.run({ params: { id }, body });
      setSelected([]);
      setCompensating(false);
      query.reload();
    } catch {
      /* Report per-record conflicts without replacing local edits. */
    }
  };
  const setPaused = async () => {
    try {
      if (query.data?.run.status === "paused")
        await resume.run({ params: { id } });
      else await pause.run({ params: { id } });
      query.reload();
    } catch {
      /* State is not changed optimistically. */
    }
  };
  return (
    <div className={styles.form}>
      <div className={styles.actions}>
        <ActionButton onClick={onBack}>Import runs</ActionButton>
        <ActionButton disabled={pending} onClick={query.reload}>
          Refresh reconciliation
        </ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <Panel
              title={query.data.run.sourceAccount}
              description={query.data.run.captureId}
            >
              <div className={styles.actions}>
                <Badge>{query.data.run.status}</Badge>
                {query.data.counts.map((count) => (
                  <Badge key={`${count.kind}:${count.status}`}>
                    {count.kind} · {count.status}: {count._count._all}
                  </Badge>
                ))}
              </div>
            </Panel>
            {query.data.items.map((row) => (
              <Panel
                key={row.id}
                title={row.sourceId}
                actions={<Badge>{row.status}</Badge>}
              >
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    disabled={
                      pending ||
                      !["ready", "retry", "applied"].includes(row.status)
                    }
                    checked={selected.includes(row.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.id]
                          : current.filter((value) => value !== row.id),
                      )
                    }
                  />
                  Select {row.kind} record
                </label>
                {row.reason && <p className={styles.gap}>{row.reason}</p>}
                <ActionButton onClick={() => setItem(row.id)}>
                  Inspect exact source and result
                </ActionButton>
              </Panel>
            ))}
            <div className={styles.actions}>
              <ActionButton
                primary
                disabled={
                  !selected.length ||
                  pending ||
                  !tenantId ||
                  query.data.run.status === "paused"
                }
                onClick={() => void applySelection(false)}
              >
                Apply selected records
              </ActionButton>
              <ActionButton
                disabled={!selected.length || pending || !tenantId}
                onClick={() => setCompensating(true)}
              >
                Review compensation
              </ActionButton>
              <ActionButton disabled={pending} onClick={() => void setPaused()}>
                {query.data.run.status === "paused"
                  ? "Resume import"
                  : "Pause import"}
              </ActionButton>
            </div>
            <div className={styles.actions}>
              <ActionButton
                disabled={!offset || pending}
                onClick={() => {
                  setSelected([]);
                  setOffset(Math.max(0, offset - 100));
                }}
              >
                Previous page
              </ActionButton>
              <ActionButton
                disabled={query.data.nextOffset === null || pending}
                onClick={() => {
                  setSelected([]);
                  setOffset(query.data!.nextOffset!);
                }}
              >
                Next page
              </ActionButton>
            </div>
          </>
        )}
      </StatusPanel>
      {(apply.error || compensate.error || pause.error || resume.error) && (
        <p role="alert">
          {
            (apply.error ?? compensate.error ?? pause.error ?? resume.error)
              ?.message
          }
        </p>
      )}
      {item && query.data && (
        <ImportItem
          runId={id}
          itemId={item}
          sourceAccount={query.data.run.sourceAccount}
          onClose={() => setItem(undefined)}
        />
      )}
      <Modal
        open={compensating}
        title="Compensate selected import records?"
        onOpenChange={setCompensating}
      >
        <p>
          Only untouched objects created by this run can be removed. Updated or
          referenced objects remain conflicts for review.
        </p>
        <ActionButton
          disabled={pending}
          onClick={() => void applySelection(true)}
        >
          Compensate {selected.length} selected records
        </ActionButton>
      </Modal>
    </div>
  );
}
