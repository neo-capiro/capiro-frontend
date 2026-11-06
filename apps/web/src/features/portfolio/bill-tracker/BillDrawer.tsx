"use client";
import { useState } from "react";
import { ActionButton, Modal, StatusPanel, Tabs } from "@/shared/module-ui";
import type { Destinations } from "@/shared/portfolio/config/config";
import type { ImpactRow } from "@/shared/capiro/operations/legiwatch-impact-schemas";
import { BillHearings } from "./BillHearings";
import { useTrackBill } from "./queries";
import { useImpactDetail, useImpactWrite } from "./impact-queries";
import { BillImpactEvidence, EvidenceLink } from "./BillImpactEvidence";
import { BillContextEditor } from "./BillContextEditor";
import { BillSourceDetails } from "./BillSourceDetails";
import { billDate, billActionDate } from "./hearings";
import styles from "./impact-tracker.module.css";

export function BillDrawer({
  bill,
  destinations,
  onClose,
}: {
  bill: ImpactRow;
  destinations: Destinations;
  onClose: () => void;
}) {
  const query = useImpactDetail(bill.clientId, bill.billId);
  const write = useImpactWrite(bill.clientId, bill.billId, query.scope);
  const untrack = useTrackBill(
    bill.clientId,
    query.current?.row.trackerBackend ?? bill.trackerBackend,
    onClose,
  );
  const [tab, setTab] = useState("impact");
  const [confirm, setConfirm] = useState(false);
  const refusal = [write.error, untrack.error].find((error) =>
    [403, 404].includes((error as { status?: number } | null)?.status ?? 0),
  );
  const detail = refusal ? undefined : query.current;
  const refreshing = ["queued", "running"].includes(
    detail?.refresh?.state ?? "",
  );
  const pending = write.isPending || untrack.isPending;
  return (
    <Modal
      open
      side="right"
      className={styles.drawer}
      title={bill.displayNum}
      description={`${bill.clientName} · ${bill.title}`}
      closeDisabled={pending}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <div className={styles.section}>
        <StatusPanel
          loading={query.isPending}
          error={query.error ?? refusal}
          onRetry={() => void query.refetch()}
        >
          {detail && (
            <>
              <div className={styles.toolbar}>
                <div>
                  <strong>{detail.row.status ?? "Status unavailable"}</strong>
                  <p>
                    {detail.row.latestActionText ??
                      "No latest action available"}
                  </p>
                  {detail.row.latestActionDate && (
                    <p className={styles.muted}>
                      {billActionDate(detail.row.latestActionDate)}
                    </p>
                  )}
                </div>
                <EvidenceLink href={detail.row.sourceUrl}>
                  Official bill
                </EvidenceLink>
              </div>
              <Tabs
                label="Bill detail views"
                value={tab}
                onChange={setTab}
                items={[
                  { id: "impact", label: "Client impact" },
                  { id: "sources", label: "Actions and text" },
                  { id: "context", label: "Position and notes" },
                ]}
              />
              <StatusPanel error={write.error ?? untrack.error} />
              {tab === "impact" && (
                <>
                  <div className={styles.toolbar}>
                    <p className={styles.muted}>
                      Grounded in bill provisions and this client’s evidence.
                    </p>
                    <ActionButton
                      primary
                      disabled={pending || refreshing || query.isFetching}
                      onClick={() => write.mutate(undefined)}
                    >
                      {write.isPending || refreshing
                        ? "Analysis queued…"
                        : detail.row.impact.analyzedAt
                          ? "Update impact"
                          : "Analyze impact"}
                    </ActionButton>
                  </div>
                  {refreshing && (
                    <p role="status">
                      {detail.refresh?.state === "running"
                        ? "Analyzing bill provisions and client evidence…"
                        : "Impact analysis is queued. This view will update when it is ready."}
                    </p>
                  )}
                  {detail.refresh?.state === "failed" && (
                    <p role="status">
                      Impact refresh could not be completed. Review the
                      available evidence or try updating again.
                    </p>
                  )}
                  <p className={styles.notice}>
                    Bill text:{" "}
                    {detail.sourceCoverage.billText ? "available" : "missing"}.
                    Client facts:{" "}
                    {detail.sourceCoverage.clientFacts
                      ? "available"
                      : "missing"}
                    . {detail.sourceCoverage.notes.join(" ")}
                  </p>
                  <BillImpactEvidence impact={detail.row.impact} />
                </>
              )}
              {tab === "sources" && (
                <>
                  <BillSourceDetails detail={detail} />
                  <BillHearings
                    clientId={bill.clientId}
                    billId={bill.billId}
                    backend={detail.row.trackerBackend}
                    externalApp={destinations.externalApp}
                  />
                </>
              )}
              {tab === "context" && (
                <BillContextEditor
                  key={JSON.stringify([
                    detail.row.position,
                    detail.row.priority,
                    detail.row.note,
                  ])}
                  row={detail.row}
                  pending={pending}
                  onSave={(context) => write.mutate(context)}
                />
              )}
              <section className={styles.section}>
                <p className={styles.muted}>
                  Tracked {billDate(detail.row.trackedAt) ?? "date unavailable"}
                </p>
                {confirm ? (
                  <>
                    <p>Remove this bill from {bill.clientName}’s tracker?</p>
                    <div className={styles.actions}>
                      <ActionButton
                        disabled={pending}
                        onClick={() => setConfirm(false)}
                      >
                        Cancel
                      </ActionButton>
                      <ActionButton
                        disabled={pending}
                        onClick={() =>
                          untrack.mutate({ billId: bill.billId, track: false })
                        }
                      >
                        {untrack.isPending ? "Removing…" : "Confirm untrack"}
                      </ActionButton>
                    </div>
                  </>
                ) : (
                  <div>
                    <ActionButton
                      disabled={pending}
                      onClick={() => setConfirm(true)}
                    >
                      Untrack bill
                    </ActionButton>
                  </div>
                )}
              </section>
            </>
          )}
        </StatusPanel>
      </div>
    </Modal>
  );
}
