"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
} from "../../../../shared/module-ui";
import {
  historicalStagingSource,
  requireCompatibleSponsor,
  verifyStagingProjection,
  type StagingActor,
} from "./staging-model";
import { useNewsletterStaging } from "./useNewsletterStaging";
import styles from "./newsletter-staging.module.css";
import parity from "./newsletter-figma.module.css";

export function NewsletterStaging({
  draftId,
  saved,
  open,
  onClose,
  disabled = false,
  title: newsletterTitle,
  clientName,
}: {
  draftId?: string;
  saved: boolean;
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  title?: string;
  clientName?: string;
}) {
  const me = useCapiroQuery("me.read", {}, { enabled: Boolean(draftId) });
  if (!draftId || !me.data)
    return (
      <Modal
        className={styles.dialog}
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        title="Stage in Outreach"
        description="Review a saved version before adding it to an existing Outreach session."
        footer={
          <ActionButton className={styles.button} onClick={onClose}>
            Cancel
          </ActionButton>
        }
      >
        <section className={styles.panel}>
          <h3>
            {draftId ? "Checking current access" : "Save a version first"}
          </h3>
          <p role={me.error ? "alert" : "status"}>
            {draftId
              ? (me.error?.message ?? "Checking access to saved versions…")
              : "Return to the editor and save this newsletter before selecting a version for Outreach."}
          </p>
        </section>
      </Modal>
    );
  const actor = {
    tenantId: me.data.tenant.id,
    userId: me.data.user.id,
    clerkUserId: me.data.user.clerkUserId,
  };
  return (
    <StagingSelection
      key={JSON.stringify([actor, draftId])}
      actor={actor}
      draftId={draftId}
      saved={saved}
      open={open}
      onClose={onClose}
      disabled={disabled}
      title={newsletterTitle}
      clientName={clientName}
    />
  );
}

function savedTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
function StagingSelection({
  actor,
  draftId,
  saved,
  open,
  onClose,
  disabled,
  title: newsletterTitle,
}: {
  open: boolean;
  onClose: () => void;
  actor: StagingActor;
  draftId: string;
  saved: boolean;
  disabled: boolean;
  title?: string;
  clientName?: string;
}) {
  const flow = useNewsletterStaging(actor, draftId);
  const [selectedVersion, setVersion] = useState("");
  const [selectedSession, setSession] = useState("");
  const [offset, setOffset] = useState(0);
  const [reviewed, setReviewed] = useState("");
  const [previousReviewKey, setPreviousReviewKey] = useState("");
  const original = flow.retained.record;
  const historical = Boolean(
    original && original.body.projectionVersion === undefined,
  );
  const versionId = original?.body.versionId ?? selectedVersion;
  const sessionId = original?.sessionId ?? selectedSession;
  const versions = useCapiroQuery(
    "workspace.draft.versions",
    { params: { draftId } },
    { enabled: open && flow.retained.ready },
  );
  const sessions = useCapiroQuery(
    "engagement.sessions",
    { query: { limit: 100, offset } },
    { enabled: open && flow.retained.ready },
  );
  const revision = useCapiroQuery(
    "workspace.newsletter.revision",
    { params: { draftId, versionId } },
    { enabled: open && flow.retained.ready && !!versionId && !historical },
  );
  const historicalSource = useCapiroQuery(
    "workspace.draft",
    { params: { id: draftId } },
    { enabled: open && flow.retained.ready && historical },
  );
  const destination = useCapiroQuery(
    "engagement.session",
    { params: { sessionId } },
    { enabled: open && flow.retained.ready && !!sessionId },
  );
  const selected = historical ? undefined : revision.data;
  const target = destination.data;
  let unavailable = "";
  try {
    if (
      selected &&
      (selected.draftId !== draftId ||
        selected.versionId !== versionId ||
        (original && selected.snapshotHash !== original.body.snapshotHash))
    )
      throw new Error(
        "The saved revision receipt does not match the selection.",
      );
    if (target && target.session.id !== sessionId)
      throw new Error(
        "The Outreach receipt does not match the selected session.",
      );
    if (selected && target)
      requireCompatibleSponsor(selected, target.spec.sponsor);
    if (original && selected) verifyStagingProjection(original, selected);
    if (historical && historicalSource.data && target)
      requireCompatibleSponsor(
        historicalStagingSource(historicalSource.data, draftId),
        target.spec.sponsor,
      );
    if (
      !original &&
      target &&
      (target.session.archivedAt || target.session.status !== "active")
    )
      throw new Error("This Outreach session is unavailable for new staging.");
  } catch (cause) {
    unavailable =
      cause instanceof Error ? cause.message : "Selection unavailable.";
  }
  const reviewKey = JSON.stringify([
    versionId,
    selected?.snapshotHash,
    selected?.projectionVersion,
    selected?.projectionHash,
    selected?.clientId,
    original?.body.requestId,
    historical ? historicalSource.data?.clientId : undefined,
    sessionId,
    target?.currentStateVersion,
    target?.spec.sponsor,
  ]);
  if (previousReviewKey !== reviewKey) {
    setPreviousReviewKey(reviewKey);
    setReviewed("");
  }
  const ready =
    (historical
      ? historicalSource.data &&
        !historicalSource.loading &&
        !historicalSource.error
      : selected && !revision.loading && !revision.error) &&
    target &&
    !unavailable &&
    !destination.loading &&
    !destination.error;
  const failure =
    flow.retained.error ||
    unavailable ||
    versions.error?.message ||
    sessions.error?.message ||
    (historical ? historicalSource.error?.message : revision.error?.message) ||
    destination.error?.message;
  const finishing = useRef(false);
  useEffect(() => {
    if (
      finishing.current &&
      flow.retained.ready &&
      !flow.receipt &&
      !flow.retained.record
    ) {
      finishing.current = false;
      onClose();
    }
  }, [flow.retained.ready, flow.receipt, flow.retained.record, onClose]);
  const confirmed = Boolean(flow.receipt && flow.retained.ready);
  const state = confirmed
    ? "confirmed"
    : original
      ? "original"
      : failure
        ? "refresh"
        : "review";
  const currentVersion = versions.data?.find(
    (item) => item.draftId === draftId && item.id === versionId,
  );
  const versionLabel = currentVersion?.label ?? "Saved version";
  const timestamp = flow.receipt?.staged.savedAt ?? currentVersion?.createdAt;
  const destinationLabel =
    target?.session.id === sessionId ? target.session.title : undefined;
  const busy = flow.busy;
  const canAct = ready && flow.retained.ready && !disabled && !busy;
  function refresh() {
    setReviewed("");
    if (!flow.retained.ready) flow.retained.retry();
    versions.reload();
    sessions.reload();
    revision.reload();
    historicalSource.reload();
    destination.reload();
  }
  const title = {
    review: "Stage in Outreach",
    refresh: "Review needs refreshing",
    original: "Retry original staging",
    confirmed: "Saved version staged",
  }[state];
  const description = {
    review: newsletterTitle || "Newsletter",
    refresh:
      "Staging stays unavailable until the current review can be verified.",
    original: "Staging was not confirmed. The original request is preserved.",
    confirmed: "The original staging receipt confirms this saved version.",
  }[state];
  return (
    <Modal
      className={`${styles.dialog} ${styles[state]}`}
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      description={description}
      footer={
        <>
          <ActionButton
            className={styles.button}
            disabled={confirmed && (busy || disabled)}
            onClick={() => {
              if (confirmed) {
                finishing.current = true;
                void flow.acknowledge();
              } else onClose();
            }}
          >
            {confirmed ? "Done" : "Cancel"}
          </ActionButton>
          {confirmed ? (
            <ActionButton asChild primary className={styles.button}>
              <Link
                href={`/modules/engagement?view=outreach&session=${encodeURIComponent(sessionId)}`}
              >
                Open Outreach
              </Link>
            </ActionButton>
          ) : failure ? (
            <ActionButton
              primary
              className={styles.button}
              disabled={busy || disabled}
              onClick={refresh}
            >
              Refresh review
            </ActionButton>
          ) : (
            <ActionButton
              primary
              className={styles.button}
              disabled={!canAct || reviewed !== reviewKey}
              onClick={() => {
                if (original) void flow.stage();
                else if (canAct && selected)
                  void flow.stage({
                    sessionId,
                    draftId,
                    versionId,
                    snapshotHash: selected.snapshotHash,
                    projectionVersion: selected.projectionVersion,
                    projectionHash: selected.projectionHash,
                    expectedStateVersion: target.currentStateVersion,
                  });
              }}
            >
              {busy
                ? "Checking staging…"
                : original
                  ? "Retry original staging"
                  : "Stage saved version"}
            </ActionButton>
          )}
        </>
      }
    >
      {state === "review" && (
        <section className={parity.panel}>
          <h3 className={parity.stagePanelTitle}>
            Prepare this version for delivery
          </h3>
          <p className={parity.stagePanelText}>
            Save this version and stage it in Engagement Outreach. There you can
            choose destinations, review the preview, and send from your
            connected mailbox.
          </p>
          <p className={parity.stagePanelText}>
            Further edits in Workspace can be staged as a new version.
          </p>
        </section>
      )}
      {state === "review" && (
        <>
          <div className={styles.fields}>
            <Field label="Saved version" htmlFor="staging-version">
              <SelectInput
                id="staging-version"
                value={selectedVersion}
                disabled={busy || disabled || !flow.retained.ready}
                onValueChange={(value) => {
                  setReviewed("");
                  setVersion(value);
                }}
                placeholder="Choose saved version"
                options={(versions.data ?? [])
                  .filter((item) => item.draftId === draftId)
                  .map((item) => ({
                    value: item.id,
                    label: `${item.label ?? "Saved version"} · ${savedTime(item.createdAt)}`,
                  }))}
              />
            </Field>
            <Field label="Outreach session" htmlFor="staging-session">
              <SelectInput
                id="staging-session"
                value={selectedSession}
                disabled={busy || disabled || !flow.retained.ready}
                onValueChange={(value) => {
                  setReviewed("");
                  setSession(value);
                }}
                placeholder="Choose Outreach session"
                options={(sessions.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.title ?? "Untitled Outreach session",
                }))}
              />
            </Field>
          </div>
          {(offset > 0 || sessions.data?.length === 100) && (
            <div className={styles.paging}>
              <ActionButton
                className={styles.button}
                disabled={offset === 0 || busy || disabled}
                onClick={() => {
                  setOffset(offset - 100);
                  setSession("");
                }}
              >
                Previous sessions
              </ActionButton>
              <ActionButton
                className={styles.button}
                disabled={sessions.data?.length !== 100 || busy || disabled}
                onClick={() => {
                  setOffset(offset + 100);
                  setSession("");
                }}
              >
                More sessions
              </ActionButton>
            </div>
          )}
          <section className={styles.panel}>
            <h3>Content to stage</h3>
            {ready && selected ? (
              <>
                <div className={styles.preview}>
                  <p>Subject</p>
                  <p data-staging-subject>
                    {selected.contentSkeleton.subject || (
                      <em>Empty subject (staged unchanged)</em>
                    )}
                  </p>
                </div>
                <div className={styles.preview}>
                  <p>Plain text</p>
                  <p data-staging-plaintext>{selected.contentSkeleton.body}</p>
                </div>
                <p className={styles.caption}>
                  This is the selected saved version. Unsaved edits are
                  excluded.
                </p>
              </>
            ) : (
              <p role="status">
                {!flow.retained.ready || revision.loading || destination.loading
                  ? "Checking saved content and current access…"
                  : "Choose a saved version and an Outreach session to review the exact content."}
              </p>
            )}
          </section>
          <p className={styles.caption}>
            Outreach receives the subject and plain text shown above. Images,
            layout and rich formatting are not included.
          </p>
          {!saved && (
            <p className={styles.caption}>
              Your unsaved editor changes are excluded.
            </p>
          )}
          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={reviewed === reviewKey}
              disabled={!canAct}
              onChange={(event) =>
                setReviewed(event.target.checked ? reviewKey : "")
              }
            />
            I reviewed this saved version and the selected Outreach session.
          </label>
        </>
      )}
      {state === "refresh" && (
        <>
          <section className={styles.panel}>
            <h3>The saved version or session needs checking</h3>
            <p>
              Refresh the review to see the current saved content and
              destination. Review it again before staging.
            </p>
            <p className={styles.caption}>
              Staging stays unavailable until the refreshed review is confirmed.
            </p>
          </section>
          <p className={styles.caption}>
            If this version or session is no longer available to you, return to
            Workspace. No replacement is selected automatically.
          </p>
        </>
      )}
      {(state === "original" || state === "confirmed") && (
        <>
          <section className={styles.panel}>
            <h3>
              {confirmed ? "Ready in Outreach" : "Original saved version"}
            </h3>
            <div>
              <p>
                {versionLabel}
                {timestamp ? ` · saved ${savedTime(timestamp)} UTC` : ""}
              </p>
              <p>
                Outreach session
                {destinationLabel
                  ? ` · ${destinationLabel}`
                  : " · Original selected session"}
              </p>
            </div>
            <p className={styles.caption}>
              {confirmed
                ? "This receipt belongs to the original request. It does not describe a newer saved version."
                : "The same original inputs and request identity are used. No new request is created."}
            </p>
          </section>
          <p>
            {confirmed
              ? "Opening Outreach does not send this newsletter. Review destinations and delivery in Outreach."
              : "Retry the original staging action. If it already completed, its saved result will be shown. Otherwise this retry may complete the original staging."}
          </p>
          {!confirmed && (
            <label className={styles.confirmation}>
              <input
                type="checkbox"
                checked={reviewed === reviewKey}
                disabled={!canAct}
                onChange={(event) =>
                  setReviewed(event.target.checked ? reviewKey : "")
                }
              />
              I want to retry the exact original staging action.
            </label>
          )}
        </>
      )}
      {failure && <p role="alert">{failure}</p>}
      {original && flow.error && !failure && <p role="alert">{flow.error}</p>}
      {disabled && (
        <p role="status">
          Finish the editor’s pending save recovery before continuing.
        </p>
      )}
    </Modal>
  );
}
