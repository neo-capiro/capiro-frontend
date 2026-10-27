"use client";
import { useState } from "react";
import { ResearchReviewTools } from "./ResearchReviewTools";
import { ResearchReviewEvidence } from "./ResearchEvidence";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  researchDecisionRequestLimitBytes,
  type ResearchDetail,
} from "../../../shared/capiro/operations/research-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  Panel,
  StatusPanel,
  Tabs,
  TextArea,
} from "../../../shared/module-ui";
type Decision = "include" | "exclude" | "defer" | "reopen" | "dispute";
export function ResearchReviews({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const api = useCapiro();
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const [lane, setLane] = useState<"mine" | "team" | "deferred" | "resolved">(
    "mine",
  );
  const [selected, setSelected] = useState<{
    id: string;
    revision: number;
    reason: string;
  }>();
  const [decision, setDecision] = useState<Decision>("include");
  const [reason, setReason] = useState("");
  const [forSelection, setForSelection] = useState<number[]>([]);
  const [againstSelection, setAgainstSelection] = useState<number[]>([]);
  const [decisionKey, setDecisionKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("research.reviews", {
    params: { id: portfolio.id },
    query: { lane },
  });
  const verifiedRows = query.data?.every(
    (item) => item.portfolioId === portfolio.id,
  )
    ? query.data
    : undefined;
  const mismatchedRows =
    query.data && !verifiedRows
      ? "These reviews do not match the selected portfolio."
      : undefined;
  const currentReview =
    selected && !query.loading && !query.error
      ? verifiedRows?.find(
          (item) =>
            item.id === selected.id && item.revision === selected.revision,
        )
      : undefined;
  const evidenceFor =
    currentReview?.evidenceFor.filter((_, index) =>
      forSelection.includes(index),
    ) ?? [];
  const evidenceAgainst =
    currentReview?.evidenceAgainst.filter((_, index) =>
      againstSelection.includes(index),
    ) ?? [];
  const needsEvidence = ["include", "exclude", "dispute"].includes(decision);
  const decisionInput =
    selected && currentReview
      ? {
          params: { id: portfolio.id, reviewId: selected.id },
          body: {
            expectedRevision: selected.revision,
            expectedPortfolioRevision: portfolio.revision,
            idempotencyKey: decisionKey,
            decisionType: decision,
            reason,
            evidenceFor,
            evidenceAgainst,
          },
        }
      : undefined;
  const selectionTooLarge = decisionInput
    ? new TextEncoder().encode(JSON.stringify(decisionInput)).byteLength >
      researchDecisionRequestLimitBytes
    : false;
  const ready =
    editable &&
    !!currentReview &&
    !busy &&
    !error &&
    !selectionTooLarge &&
    Boolean(reason.trim()) &&
    (!needsEvidence || evidenceFor.length + evidenceAgainst.length > 0);
  function refreshReviews() {
    setSelected(undefined);
    setError(undefined);
    query.reload();
  }
  async function decide() {
    if (!decisionInput || !ready) return;
    setBusy(true);
    setError(undefined);
    try {
      const receipt = await api.request(
        "research.reviews.decide",
        decisionInput,
      );
      const failed = receipt.outcomes.find((o) =>
        ["failed", "conflict"].includes(o.status),
      );
      if (failed)
        throw new Error(
          failed.message || "Review changed. Reload before deciding.",
        );
      setSelected(undefined);
      query.reload();
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save decision");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Reviews">
      <Tabs
        items={["mine", "team", "deferred", "resolved"].map((id) => ({
          id,
          label: id.charAt(0).toUpperCase() + id.slice(1),
        }))}
        value={lane}
        onChange={(id) => setLane(id as typeof lane)}
      />
      <StatusPanel
        loading={query.loading}
        error={query.error || error || mismatchedRows}
        onRetry={refreshReviews}
      >
        <DataTable
          rows={verifiedRows || []}
          rowKey={(r) => r.id}
          caption="Research portfolio review queue"
          columns={[
            { key: "target", label: "Target", render: (r) => r.targetId },
            { key: "reason", label: "Reason", render: (r) => r.reason },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge>{r.status}</Badge>,
            },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <ActionButton
                  disabled={portfolio.lifecycle === "archived"}
                  onClick={() => {
                    setSelected(r);
                    setReason("");
                    setForSelection([]);
                    setAgainstSelection([]);
                    setDecision("include");
                    setDecisionKey(crypto.randomUUID());
                    setError(undefined);
                  }}
                >
                  Review
                </ActionButton>
              ),
            },
          ]}
        />
      </StatusPanel>
      <Modal
        open={!!selected}
        onOpenChange={(v) => {
          if (!v && !busy) {
            if (error) refreshReviews();
            else setSelected(undefined);
          }
        }}
        title="Review decision"
        footer={
          <ActionButton primary disabled={!ready} onClick={decide}>
            Save decision
          </ActionButton>
        }
      >
        <p>{currentReview?.reason}</p>
        {selected && !currentReview && (
          <p role="alert">
            Refresh the queue to read the current review and its recorded
            evidence.
          </p>
        )}
        {currentReview && (
          <>
            <p>
              Select the exact recorded evidence to include with this decision.
              Include, exclude and dispute require at least one source
              reference.
            </p>
            <ResearchReviewEvidence
              evidence={currentReview.evidenceFor}
              selected={forSelection}
              disabled={!editable || busy || Boolean(error)}
              onSelect={setForSelection}
              stance="for"
            />
            <ResearchReviewEvidence
              evidence={currentReview.evidenceAgainst}
              selected={againstSelection}
              disabled={!editable || busy || Boolean(error)}
              onSelect={setAgainstSelection}
              stance="against"
            />
            <ResearchReviewTools
              key={currentReview.id}
              portfolio={portfolio}
              review={currentReview}
              onReload={() => {
                query.reload();
                onReload();
              }}
            />
          </>
        )}
        <Field label="Decision" htmlFor="review-decision">
          <select
            id="review-decision"
            value={decision}
            disabled={!editable || busy || Boolean(error)}
            onChange={(e) => setDecision(e.target.value as Decision)}
          >
            {["include", "exclude", "defer", "reopen", "dispute"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Reason" htmlFor="review-reason">
          <TextArea
            id="review-reason"
            maxLength={4000}
            value={reason}
            disabled={!editable || busy || Boolean(error)}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {selectionTooLarge && (
          <p role="alert">
            The selected evidence exceeds the 1 MB decision limit. Select fewer
            citations before saving. Quotes and exact locations are not
            shortened.
          </p>
        )}
        {error && (
          <>
            <p role="alert">{error}</p>
            <p>
              The decision result was not confirmed. Read the current review
              before making another decision.
            </p>
            <ActionButton onClick={refreshReviews}>
              Refresh review queue
            </ActionButton>
          </>
        )}
      </Modal>
    </Panel>
  );
}
