"use client";
import { useState } from "react";
import type { PublicationVersion } from "../../../../../shared/capiro/operations/legiwatch-publication-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { downloadText, LegiWatchTabs, timecode } from "../components";
import styles from "../legiwatch.module.css";
import { PublicationDelivery } from "./PublicationDelivery";

export function PublicationReview({
  sessionId,
  version,
  onEdit,
  onApproved,
}: {
  sessionId: string;
  version: PublicationVersion;
  onEdit: () => void;
  onApproved: () => void;
}) {
  const [attested, setAttested] = useState(false),
    [tab, setTab] = useState("review");
  const approve = useCapiroMutation("legiwatch.publication.approve"),
    document = useCapiroQuery(
      "legiwatch.publication.document",
      {
        params: { sessionId, id: version.id },
        query: { contentHash: version.contentHash },
      },
      {
        enabled:
          tab === "document" &&
          version.status === "approved" &&
          version.payload.kind === "hearing_recap" &&
          Boolean(version.payload.clientId),
      },
    );
  const history = useCapiroQuery(
    "legiwatch.publication.deliveries",
    { params: { sessionId, id: version.id } },
    { enabled: tab === "history" },
  );
  async function confirm() {
    try {
      await approve.run({
        params: { sessionId, id: version.id },
        body: { contentHash: version.contentHash, attestSupported: true },
      });
      onApproved();
    } catch {
      /* Backend recheck error shown below. */
    }
  }
  return (
    <>
      <LegiWatchTabs
        value={tab}
        items={[
          { id: "review", label: "Version review" },
          { id: "delivery", label: "Delivery preview" },
          { id: "history", label: "Delivery history" },
          { id: "document", label: "Approved document" },
        ]}
        onChange={setTab}
        label="Publication version"
      />
      {tab === "review" && (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span>Version</span>
              <strong>{version.version}</strong>
            </div>
            <div className={styles.stat}>
              <span>Claims</span>
              <strong>{version.payload.claims.length}</strong>
            </div>
            <div className={styles.stat}>
              <span>Final evidence</span>
              <strong>{version.payload.evidence.length}</strong>
            </div>
            <div className={styles.stat}>
              <span>Review</span>
              <strong>{version.status}</strong>
            </div>
          </div>
          <section className={styles.card}>
            <h2>{version.payload.title}</h2>
            <Badge>{version.payload.label}</Badge>
            <p className={styles.description}>
              Content hash · {version.contentHash}
              <br />
              Transcript · {version.payload.coverage.transcript} · Audio ·{" "}
              {version.payload.coverage.audio}
            </p>
            {version.payload.coverage.missing.map((item) => (
              <p className={styles.gap} key={item}>
                {item}
              </p>
            ))}
            {version.payload.claims.map((claim) => (
              <article className={styles.listItem} key={claim.id}>
                <Badge>{claim.kind}</Badge>
                <p className={styles.briefText}>{claim.text}</p>
                {claim.evidenceIds.map((id) => {
                  const evidence = version.payload.evidence.find(
                    (item) => item.segmentId === id,
                  );
                  return evidence ? (
                    <blockquote className={styles.banner} key={id}>
                      <strong>
                        {timecode(evidence.startMs)} ·{" "}
                        {evidence.speakerLabel ?? "Speaker not identified"}
                      </strong>
                      {evidence.text}
                      <p>
                        Segment {id} · {evidence.hash}
                      </p>
                    </blockquote>
                  ) : (
                    <p className={styles.error} key={id}>
                      Referenced evidence unavailable.
                    </p>
                  );
                })}
              </article>
            ))}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={attested}
                onChange={(event) => setAttested(event.target.checked)}
                disabled={version.status === "approved"}
              />
              I reviewed every claim, exact supporting evidence and audience
              scope.
            </label>
            <div className={styles.actions}>
              <ActionButton
                primary
                disabled={
                  !attested || approve.pending || version.status !== "draft"
                }
                onClick={() => void confirm()}
              >
                {approve.pending
                  ? "Rechecking exact evidence…"
                  : "Approve this version"}
              </ActionButton>
              <ActionButton disabled={approve.pending} onClick={onEdit}>
                Return for changes
              </ActionButton>
            </div>
            {approve.error && (
              <p role="alert" className={styles.error}>
                {approve.error.message}
              </p>
            )}
          </section>
          <div className={styles.banner}>
            <strong>Changing content creates a new version</strong>Approval is
            tied to this exact content hash and retained evidence. Permissions
            and source revisions are checked again by the backend.
          </div>
        </>
      )}
      {tab === "delivery" &&
        (version.status === "approved" ? (
          <PublicationDelivery
            sessionId={sessionId}
            version={version}
            onQueued={() => {
              setTab("history");
              history.reload();
            }}
          />
        ) : (
          <p className={styles.banner}>
            Approve this immutable version before previewing delivery.
          </p>
        ))}
      {tab === "history" && (
        <StatusPanel
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
          empty={
            history.data?.length === 0
              ? "No queued publication deliveries."
              : undefined
          }
        >
          <ActionButton onClick={history.reload}>Refresh history</ActionButton>
          <div className={styles.list}>
            {history.data?.map((delivery) => (
              <section className={styles.card} key={delivery.id}>
                <h2>
                  Approved {new Date(delivery.approvedAt).toLocaleString()}
                </h2>
                {delivery.recipients.map((recipient) => (
                  <article className={styles.listItem} key={recipient.id}>
                    <div className={styles.row}>
                      <strong>{recipient.destination}</strong>
                      <Badge>
                        {recipient.state === "provider_accepted"
                          ? "Accepted by provider"
                          : recipient.state === "uncertain"
                            ? "Outcome unconfirmed"
                            : recipient.state.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p>
                      {recipient.channel} · {recipient.name}
                    </p>
                    {recipient.error && (
                      <p className={styles.error}>{recipient.error}</p>
                    )}
                  </article>
                ))}
              </section>
            ))}
          </div>
        </StatusPanel>
      )}
      {tab === "document" &&
        (version.status === "approved" &&
        version.payload.kind === "hearing_recap" &&
        version.payload.clientId ? (
          <StatusPanel
            loading={document.loading}
            error={document.error}
            onRetry={document.reload}
          >
            {document.data && (
              <section className={styles.card}>
                <h2>Approved client recap</h2>
                <pre className={styles.briefText}>{document.data.markdown}</pre>
                <ActionButton
                  onClick={() =>
                    downloadText(
                      document.data!.markdown,
                      `hearing-recap-${version.id}.md`,
                      "text/markdown;charset=utf-8",
                    )
                  }
                >
                  Download approved document
                </ActionButton>
              </section>
            )}
          </StatusPanel>
        ) : (
          <p className={styles.banner}>
            An approved client-specific hearing recap is required. Source
            distribution permission is rechecked when opening the document.
          </p>
        ))}
    </>
  );
}
