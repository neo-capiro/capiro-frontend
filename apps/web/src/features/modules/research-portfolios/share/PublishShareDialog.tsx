"use client";
import { useState } from "react";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";
import type { ResearchDashboardDesign } from "../../../../shared/capiro/operations/research-share-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  StatusPanel,
} from "../../../../shared/module-ui";
import { ResearchDashboardView } from "./ResearchDashboardView";
import { ShareExposure } from "./ShareExposure";
import { useSharePublish } from "./useSharePublish";
import styles from "./share.module.css";

/** The publish boundary: choose a frozen payload, review it, then send that exact version. */
export function PublishShareDialog({
  portfolio,
  designs,
  snapshots,
  canPublish,
  onChanged,
  onClose,
}: {
  portfolio: ResearchDetail;
  designs: readonly ResearchDashboardDesign[];
  snapshots: NonNullable<
    ReturnType<typeof useCapiroQuery<"research.snapshots">>["data"]
  >;
  canPublish: boolean;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [clientId, setClientId] = useState(
    portfolio.clientLinks[0]?.clientId ?? "",
  );
  const [snapshotId, setSnapshotId] = useState(snapshots[0]?.id ?? "");
  const [designId, setDesignId] = useState(designs[0]?.id ?? "");
  const [branding, setBranding] = useState(true);
  const [operationKey] = useState(() => crypto.randomUUID());
  const [reviewedHash, setReviewedHash] = useState<string>();
  const [copied, setCopied] = useState(false);
  const publish = useSharePublish(onChanged);
  const frozen = Boolean(publish.pending || publish.busy);
  const preview = useCapiroQuery(
    "research.sharePreview",
    {
      params: { id: portfolio.id },
      body: { snapshotId, designId, clientId, branding },
    },
    {
      enabled: Boolean(
        clientId && snapshotId && designId && !publish.issued && !publish.lost,
      ),
    },
  );
  const ready =
    canPublish &&
    preview.data &&
    !preview.loading &&
    !preview.error &&
    reviewedHash === preview.data.previewHash;
  const url = publish.issued
    ? `${window.location.origin}/share/${publish.issued.token}`
    : "";
  const finished = Boolean(publish.issued || publish.lost);
  async function submit() {
    if (!ready || !preview.data || frozen) return;
    await publish.publish({
      params: { id: portfolio.id },
      body: {
        operationKey,
        snapshotId,
        designId,
        clientId,
        branding,
        previewHash: preview.data.previewHash,
        expectedDesignVersion: preview.data.designVersion,
      },
    });
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !frozen) onClose();
      }}
      closeDisabled={frozen}
      className={styles.publishDialog}
      title={finished ? "Link published" : "Publish a client link"}
      description={
        finished
          ? "The address is shown once. Share the PIN separately yourself."
          : "Review exactly the frozen snapshot, design and client content the recipient will receive."
      }
      footer={
        finished ? (
          <ActionButton primary onClick={onClose}>
            Done
          </ActionButton>
        ) : publish.pending ? (
          <ActionButton
            primary
            disabled={publish.busy}
            onClick={publish.retryReady ? publish.retry : publish.reconcile}
          >
            {publish.retryReady
              ? "Retry this publication"
              : "Check publication result"}
          </ActionButton>
        ) : (
          <ActionButton
            primary
            disabled={!ready || publish.busy}
            onClick={submit}
          >
            Publish
          </ActionButton>
        )
      }
    >
      {publish.issued ? (
        <div className={styles.linkBox}>
          <code>{url}</code>
          <ActionButton
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </ActionButton>
        </div>
      ) : publish.lost ? (
        <p role="status">
          This publication created one link, but its one-time address was not
          received here. It cannot be recovered. Close this dialog and publish a
          new link explicitly if you need another address.
        </p>
      ) : (
        <div className={styles.stack}>
          <div className={styles.form}>
            <Field label="Client" htmlFor="share-client">
              <SelectInput
                id="share-client"
                value={clientId}
                onValueChange={setClientId}
                disabled={frozen}
                options={portfolio.clientLinks.map((client) => ({
                  value: client.clientId,
                  label: client.clientName,
                }))}
              />
            </Field>
            <Field label="Snapshot" htmlFor="share-snapshot">
              <SelectInput
                id="share-snapshot"
                value={snapshotId}
                onValueChange={setSnapshotId}
                disabled={frozen}
                options={snapshots.map((snapshot) => ({
                  value: snapshot.id,
                  label: `${snapshot.name} · ${new Date(snapshot.capturedAt).toLocaleString()}`,
                }))}
              />
            </Field>
            <Field label="Design" htmlFor="share-design">
              <SelectInput
                id="share-design"
                value={designId}
                onValueChange={setDesignId}
                disabled={frozen}
                options={designs.map((design) => ({
                  value: design.id,
                  label: `${design.name} v${design.version}`,
                }))}
              />
            </Field>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={branding}
                disabled={frozen}
                onChange={(event) => setBranding(event.target.checked)}
              />
              Show our firm name and logo on the dashboard
            </label>
          </div>
          <StatusPanel
            loading={preview.loading}
            error={preview.error}
            onRetry={preview.reload}
          >
            {preview.data && (
              <>
                <ShareExposure dashboard={preview.data.dashboard} />
                <section aria-label="Recipient preview">
                  <ResearchDashboardView
                    dashboard={preview.data.dashboard}
                    logoUrl={preview.data.logoUrl}
                  />
                </section>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={reviewedHash === preview.data.previewHash}
                    disabled={frozen}
                    onChange={(event) =>
                      setReviewedHash(
                        event.target.checked
                          ? preview.data?.previewHash
                          : undefined,
                      )
                    }
                  />
                  I reviewed this frozen dashboard and everything it exposes.
                </label>
              </>
            )}
          </StatusPanel>
          {publish.retryReady && (
            <p role="status">
              No link was recorded for this publication. You can retry the exact
              same request.
            </p>
          )}
          {publish.error && <p role="alert">{publish.error}</p>}
        </div>
      )}
    </Modal>
  );
}
