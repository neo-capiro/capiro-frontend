"use client";
import Link from "next/link";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
} from "../../../../shared/module-ui";
import {
  historicalStagingSource,
  requireCompatibleSponsor,
  verifyStagingProjection,
  type StagingActor,
} from "./staging-model";
import { useNewsletterStaging } from "./useNewsletterStaging";
import styles from "../workspace.module.css";

export function NewsletterStaging({
  draftId,
  saved,
}: {
  draftId: string;
  saved: boolean;
}) {
  const me = useCapiroQuery("me.read", {});
  if (!me.data)
    return (
      <p role={me.error ? "alert" : "status"}>
        {me.error?.message ?? "Checking current Core identity…"}
      </p>
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
    />
  );
}

function StagingSelection({
  actor,
  draftId,
  saved,
}: {
  actor: StagingActor;
  draftId: string;
  saved: boolean;
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
    { enabled: flow.retained.ready },
  );
  const sessions = useCapiroQuery(
    "engagement.sessions",
    { query: { limit: 100, offset } },
    { enabled: flow.retained.ready },
  );
  const revision = useCapiroQuery(
    "workspace.newsletter.revision",
    { params: { draftId, versionId } },
    { enabled: flow.retained.ready && !!versionId && !historical },
  );
  const historicalSource = useCapiroQuery(
    "workspace.draft",
    { params: { id: draftId } },
    { enabled: flow.retained.ready && historical },
  );
  const destination = useCapiroQuery(
    "engagement.session",
    { params: { sessionId } },
    { enabled: flow.retained.ready && !!sessionId },
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
    historical ? original?.body.requestId : undefined,
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
  const error = flow.retained.error ?? unavailable ?? "";
  if (!flow.retained.ready)
    return (
      <div role={flow.retained.error ? "alert" : "status"}>
        <p>{error || "Checking saved staging recovery…"}</p>
        {flow.retained.error && (
          <ActionButton onClick={flow.retained.retry}>
            Retry staging recovery
          </ActionButton>
        )}
      </div>
    );
  return (
    <div className={styles.form}>
      <p>
        {saved
          ? "Choose a saved revision to stage."
          : "Unsaved editor changes are excluded. Choose an existing saved revision, or save in the editor first."}{" "}
        Staging replaces the session’s content skeleton. It does not generate or
        send messages.
      </p>
      {original ? (
        <p role="status">
          Original staging request retained: {original.body.requestId}. Recovery
          uses its original revision and state version{" "}
          {original.body.expectedStateVersion}.
        </p>
      ) : (
        <>
          <Field label="Saved Newsletter revision" htmlFor="staging-version">
            <SelectInput
              id="staging-version"
              value={selectedVersion}
              disabled={flow.busy}
              onValueChange={(value) => {
                setReviewed("");
                setVersion(value);
              }}
              placeholder="Choose saved revision"
              options={(versions.data ?? [])
                .filter((item) => item.draftId === draftId)
                .map((item) => ({
                  value: item.id,
                  label: `${item.label ?? "Saved revision"} · ${item.createdAt} · ${item.id}`,
                }))}
            />
          </Field>
          <Field label="Existing Outreach session" htmlFor="staging-session">
            <SelectInput
              id="staging-session"
              value={selectedSession}
              disabled={flow.busy}
              onValueChange={(value) => {
                setReviewed("");
                setSession(value);
              }}
              placeholder="Choose existing session"
              options={(sessions.data ?? []).map((item) => ({
                value: item.id,
                label: `${item.title ?? item.id} · ${item.status}`,
              }))}
            />
          </Field>
          <div className={styles.actions}>
            <ActionButton
              disabled={offset === 0 || flow.busy}
              onClick={() => {
                setOffset(offset - 100);
                setSession("");
              }}
            >
              Previous sessions
            </ActionButton>
            <ActionButton
              disabled={sessions.data?.length !== 100 || flow.busy}
              onClick={() => {
                setOffset(offset + 100);
                setSession("");
              }}
            >
              More sessions
            </ActionButton>
          </div>
        </>
      )}
      {[
        versions.error,
        sessions.error,
        historical ? historicalSource.error : revision.error,
        destination.error,
      ]
        .filter(Boolean)
        .map((failure, index) => (
          <p role="alert" key={index}>
            {failure!.message} Saved revision staging is unavailable until the
            source and destination can be verified.
          </p>
        ))}
      {((historical ? historicalSource.loading : revision.loading) ||
        destination.loading) && (
        <p role="status">Checking selected revision and Outreach session…</p>
      )}
      {unavailable && <p role="alert">{unavailable}</p>}
      {ready && selected && (
        <Panel title="Review saved content for Outreach">
          <p>
            Revision {selected.versionId} · saved {selected.savedAt} · author{" "}
            {selected.authorId} ({selected.authorKind})
          </p>
          <p style={{ overflowWrap: "anywhere" }}>
            Snapshot SHA-256: {selected.snapshotHash}
          </p>
          <p>
            Scope:{" "}
            {selected.clientId
              ? `Client ${selected.clientId}`
              : "Explicit firm content"}
          </p>
          <h3>Authored email subject</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {selected.contentSkeleton.subject || (
              <em>Empty subject (staged unchanged)</em>
            )}
          </p>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {selected.contentSkeleton.body}
          </p>
          <p>
            Destination: {target.session.title ?? sessionId} · current version{" "}
            {target.currentStateVersion}. Rich formatting, images and
            attachments are not included.
          </p>
          {!flow.receipt && (
            <label>
              <input
                type="checkbox"
                checked={reviewed === reviewKey}
                disabled={flow.busy}
                onChange={(event) =>
                  setReviewed(event.target.checked ? reviewKey : "")
                }
              />{" "}
              I reviewed this saved text and selected destination.
            </label>
          )}
        </Panel>
      )}
      {ready && historical && original && (
        <Panel title="Recover historical staging receipt">
          <p>
            This older request is held for recovery. Its saved revision is{" "}
            {original.body.versionId}, snapshot {original.body.snapshotHash}.
            The original plaintext cannot be previewed here. Recovering its
            receipt uses the unchanged original request.
          </p>
          <p>
            Destination: {target.session.title ?? sessionId}. Current access and
            sponsor are checked again.
          </p>
          {!flow.receipt && (
            <label>
              <input
                type="checkbox"
                checked={reviewed === reviewKey}
                disabled={flow.busy}
                onChange={(event) =>
                  setReviewed(event.target.checked ? reviewKey : "")
                }
              />{" "}
              I want to recover this original staging request.
            </label>
          )}
        </Panel>
      )}
      {flow.error && <p role="alert">{flow.error}</p>}
      {flow.receipt ? (
        <Panel title="Saved revision staged">
          <p role="status">
            Receipt {flow.receipt.receiptId} · applied state version{" "}
            {flow.receipt.stateVersion}
            {flow.receipt.replayed ? " · recovered original receipt" : ""}. No
            message was sent.
          </p>
          <Link
            href={`/modules/engagement?view=outreach&session=${encodeURIComponent(sessionId)}`}
          >
            Open selected Outreach session
          </Link>
          <ActionButton
            disabled={flow.busy}
            onClick={() => void flow.acknowledge()}
          >
            Acknowledge staging receipt
          </ActionButton>
        </Panel>
      ) : (
        <ActionButton
          primary
          disabled={!ready || reviewed !== reviewKey || flow.busy}
          onClick={() =>
            ready &&
            (original
              ? void flow.stage()
              : selected &&
                void flow.stage({
                  sessionId,
                  draftId,
                  versionId,
                  snapshotHash: selected.snapshotHash,
                  projectionVersion: selected.projectionVersion,
                  projectionHash: selected.projectionHash,
                  expectedStateVersion: target.currentStateVersion,
                }))
          }
        >
          {flow.busy
            ? "Checking staging…"
            : original
              ? "Recover original staging"
              : "Stage saved revision"}
        </ActionButton>
      )}
      <ActionButton
        disabled={flow.busy}
        onClick={() => {
          setReviewed("");
          versions.reload();
          sessions.reload();
          revision.reload();
          historicalSource.reload();
          destination.reload();
        }}
      >
        Refresh saved revision and session
      </ActionButton>
    </div>
  );
}
