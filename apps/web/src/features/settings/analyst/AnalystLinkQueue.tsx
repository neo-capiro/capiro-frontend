"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  type LinkReviewKind,
  linkReviewStatus,
} from "../../../shared/capiro/operations/settings-admin/analyst-links";
import { Badge, DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsCard, SettingsNotice } from "../components";
import styles from "../styles";
import { QueuePagination } from "./QueuePagination";
import { LinkReviewDetail } from "./LinkReviewDetail";
import { useLinkReview } from "./useLinkReview";

type Props = { kind: LinkReviewKind; refreshCounts: () => void };
function ReviewerQueue({
  kind,
  refreshCounts,
  actor,
}: Props & { actor: { tenantId: string; userId: string } }) {
  const [status, setStatus] = useState<
    "candidate" | "quarantined" | "accepted" | "rejected"
  >("candidate");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const [revision, setRevision] = useState(0);
  const query = useCapiroQuery("settings.analyst.links.list", {
    params: { kind },
    query: { status, page, limit: 25 },
  });
  const refresh = () => {
    query.reload();
    setRevision((value) => value + 1);
    refreshCounts();
  };
  const review = useLinkReview(kind, actor, refresh);
  const title =
    kind === "provision" ? "Provision → PE links" : "SAM.gov matches";
  const receipt = review.receipt;
  return (
    <div className={styles.stack}>
      <SettingsCard
        title={title}
        description="Inspect the original source and proposed target before recording an exact, audited decision."
        action={
          <SettingsButton onClick={refresh}>Refresh queue</SettingsButton>
        }
      >
        <label>
          Review status
          <select
            className={styles.input}
            aria-label="Review status"
            value={status}
            onChange={(event) => {
              setStatus(linkReviewStatus.parse(event.target.value));
              setPage(1);
            }}
          >
            <option value="candidate">Candidates</option>
            {kind === "sam" && <option value="quarantined">Quarantined</option>}
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          {query.data && (
            <p>
              Current queue: {query.data.total} · Candidates:{" "}
              {query.data.counts.candidate ?? 0}
              {kind === "sam" &&
                " · Quarantined: " + (query.data.counts.quarantined ?? 0)}
              {" · Accepted: " +
                (query.data.counts.accepted ?? 0) +
                " · Rejected: " +
                (query.data.counts.rejected ?? 0)}
            </p>
          )}
          <DataTable
            rows={query.data?.data ?? []}
            rowKey={(row) => row.id}
            caption={title}
            columns={[
              {
                key: "source",
                label: "Source",
                render: (row) => row.source.title,
              },
              {
                key: "target",
                label: "Proposed target",
                render: (row) =>
                  [row.peCode, row.program?.canonicalName]
                    .filter(Boolean)
                    .join(" · ") || "Target unavailable",
              },
              {
                key: "basis",
                label: "Match basis",
                render: (row) => row.matchBasis + " · " + row.confidence,
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <Badge>{row.reviewStatus}</Badge>,
              },
              {
                key: "review",
                label: "Evidence",
                render: (row) => (
                  <SettingsButton small onClick={() => setSelected(row.id)}>
                    Inspect evidence
                  </SettingsButton>
                ),
              },
            ]}
          />
          {query.data && (
            <QueuePagination
              page={query.data.page}
              limit={query.data.limit}
              total={query.data.total}
              onChange={setPage}
            />
          )}
        </StatusPanel>
      </SettingsCard>
      {review.error && (
        <SettingsNotice title={review.error} error retry={review.retry} />
      )}
      {review.pending && (
        <SettingsNotice title="Original review outcome needs recovery">
          <p>
            Candidate {review.pending.candidateId} ·{" "}
            {review.pending.command.decision}: {review.pending.command.reason}
          </p>
          <SettingsButton
            disabled={review.busy}
            onClick={() => void review.submit()}
          >
            Recover original decision
          </SettingsButton>
        </SettingsNotice>
      )}
      {receipt && (
        <SettingsNotice
          title={
            receipt.status === "refused"
              ? "Review was not applied"
              : "Relationship " + receipt.status
          }
        >
          {receipt.status === "refused" && (
            <p>
              {receipt.refusal === "REVIEW_SOURCE_STALE"
                ? "The source or relationship changed. Inspect the refreshed evidence before making a new decision."
                : "The proposed target is unavailable or retired. Inspect the refreshed target before proceeding."}
            </p>
          )}
          <p>
            Recorded {receipt.decidedAt} · Reviewer {receipt.reviewerId}
          </p>
        </SettingsNotice>
      )}
      {selected && (
        <LinkReviewDetail
          key={selected + ":" + revision}
          kind={kind}
          id={selected}
          ready={review.ready}
          submit={review.submit}
        />
      )}
    </div>
  );
}
export function AnalystLinkQueue(props: Props) {
  const me = useCapiroQuery("me.read", {});
  return (
    <StatusPanel loading={me.loading} error={me.error} onRetry={me.reload}>
      {me.data &&
        (me.data.role === "capiro_admin" ? (
          <ReviewerQueue
            key={props.kind + ":" + me.data.tenant.id + ":" + me.data.user.id}
            {...props}
            actor={{ tenantId: me.data.tenant.id, userId: me.data.user.id }}
          />
        ) : (
          <SettingsNotice title="HQ reviewer access required" />
        ))}
    </StatusPanel>
  );
}
