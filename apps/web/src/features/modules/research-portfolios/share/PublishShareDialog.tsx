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
import { DashboardPreview } from "./DashboardPreview";
import { ShareExposure } from "./ShareExposure";
import { useSharePublish } from "./useSharePublish";
import type { SharePublishActor } from "./share-publish-recovery";
import styles from "./share.module.css";

/** The publish boundary: choose a frozen payload, review it, then send that exact version. */
type Props = {
  portfolio: ResearchDetail;
  designs: readonly ResearchDashboardDesign[];
  snapshots: NonNullable<
    ReturnType<typeof useCapiroQuery<"research.snapshots">>["data"]
  >;
  canPublish: boolean;
  onChanged: () => void;
  onClose: () => void;
};
export function PublishShareDialog(props: Props) {
  const me = useCapiroQuery("me.read", {});
  if (!me.data)
    return (
      <Modal
        open
        onOpenChange={(open) => {
          if (!open) props.onClose();
        }}
        title="Publish a client link"
      >
        <StatusPanel
          loading={me.loading}
          error={me.error}
          onRetry={me.reload}
        />
      </Modal>
    );
  const actor = { tenantId: me.data.tenant.id, userId: me.data.user.id };
  return (
    <PublishReview
      key={JSON.stringify([actor, props.portfolio.id])}
      {...props}
      actor={actor}
    />
  );
}

function PublishReview({
  portfolio,
  designs,
  snapshots,
  canPublish,
  onChanged,
  onClose,
  actor,
}: Props & { actor: SharePublishActor }) {
  const [clientId, setClientId] = useState(
    portfolio.clientLinks[0]?.clientId ?? "",
  );
  const [snapshotId, setSnapshotId] = useState(snapshots[0]?.id ?? "");
  const [designId, setDesignId] = useState(designs[0]?.id ?? "");
  const [branding, setBranding] = useState(true);
  const [reviewedHash, setReviewedHash] = useState<string>();
  const [copied, setCopied] = useState(false);
  const publish = useSharePublish(actor, portfolio.id, onChanged);
  const frozen = Boolean(publish.pending || publish.busy || !publish.ready);
  const selection = publish.pending?.body ?? {
    clientId,
    snapshotId,
    designId,
    branding,
  };
  const preview = useCapiroQuery(
    "research.sharePreview",
    {
      params: { id: portfolio.id },
      body: {
        snapshotId: selection.snapshotId,
        designId: selection.designId,
        clientId: selection.clientId,
        branding: selection.branding,
      },
    },
    {
      enabled: Boolean(
        publish.ready &&
        selection.clientId &&
        selection.snapshotId &&
        selection.designId &&
        !publish.issued &&
        !publish.lost,
      ),
    },
  );
  const ready =
    canPublish &&
    publish.ready &&
    preview.data &&
    !preview.loading &&
    !preview.error &&
    reviewedHash === preview.data.previewHash;
  const matchesRetained =
    !publish.pending ||
    (preview.data?.previewHash === publish.pending.body.previewHash &&
      preview.data.designVersion ===
        publish.pending.body.expectedDesignVersion);
  const url = publish.issued
    ? `${window.location.origin}/share/${publish.issued.token}`
    : "";
  const finished = Boolean(publish.issued || publish.lost);
  async function submit() {
    if (!ready || !preview.data || frozen) return;
    await publish.publish({
      params: { id: portfolio.id },
      body: {
        operationKey: crypto.randomUUID(),
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
                value={selection.clientId}
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
                value={selection.snapshotId}
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
                value={selection.designId}
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
                checked={selection.branding}
                disabled={frozen}
                onChange={(event) => setBranding(event.target.checked)}
              />
              Show our firm name and logo on the dashboard
            </label>
          </div>
          {publish.recoveryError && (
            <p role="alert">
              {publish.recoveryError}{" "}
              <ActionButton onClick={publish.reloadRecovery}>
                Retry recovery
              </ActionButton>
            </p>
          )}
          {!publish.ready && !publish.recoveryError && (
            <p role="status">
              Checking current access and any retained publication…
            </p>
          )}
          {publish.pending && (
            <p role="status">
              A publication is retained with its original choices. Check its
              recorded result before continuing.
            </p>
          )}
          <StatusPanel
            loading={preview.loading}
            error={preview.error}
            onRetry={preview.reload}
          >
            {preview.data && !matchesRetained && (
              <p role="status">
                The current preview has changed since this retained publication.
                Check its recorded result before preparing anything new.
              </p>
            )}
            {preview.data && matchesRetained && (
              <>
                <ShareExposure dashboard={preview.data.dashboard} />
                <section aria-label="Recipient preview">
                  <DashboardPreview>
                    <ResearchDashboardView
                      preview
                      dashboard={preview.data.dashboard}
                      logoUrl={preview.data.logoUrl}
                    />
                  </DashboardPreview>
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
