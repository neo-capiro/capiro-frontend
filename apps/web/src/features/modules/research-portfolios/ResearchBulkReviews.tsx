"use client";
import { useState } from "react";
import type { z } from "zod";
import { researchPortfolioOperations } from "../../../shared/capiro/operations/research-portfolios";
import {
  researchDecisionRequestLimitBytes,
  type ResearchDetail,
  type ResearchReview,
  type researchReviewMutationReceipt,
} from "../../../shared/capiro/operations/research-schemas";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import { CapiroApiError } from "../../../shared/capiro/http";
import {
  ActionButton,
  DataTable,
  Field,
  Panel,
  StatusPanel,
  TextArea,
} from "../../../shared/module-ui";
import { ResearchReviewEvidence } from "./ResearchEvidence";
import styles from "./research.module.css";
type Request = z.infer<
  (typeof researchPortfolioOperations)["research.reviews.bulk"]["request"]
>;
type Receipt = z.infer<typeof researchReviewMutationReceipt>;
type Choice = { revision: number; for: number[]; against: number[] };

export function ResearchBulkReviews({
  portfolio,
  reviews,
  available,
  onRefresh,
}: {
  portfolio: ResearchDetail;
  reviews: readonly ResearchReview[];
  available: boolean;
  onRefresh: () => void;
}) {
  const action = useCapiroMutation("research.reviews.bulk");
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [decision, setDecision] =
    useState<Request["body"]["items"][number]["decisionType"]>("include");
  const [reason, setReason] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState<Request>();
  const [receipt, setReceipt] = useState<Receipt>();
  const [receiptError, setReceiptError] = useState<Error>();
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const locked = !editable || action.pending || Boolean(submitted);
  const selected = reviews.filter(
    (review) => choices[review.id]?.revision === review.revision,
  );
  const draft: Request = {
    params: { id: portfolio.id },
    body: {
      idempotencyKey: key,
      expectedRevision: portfolio.revision,
      items: selected.map((review) => ({
        reviewId: review.id,
        expectedRevision: review.revision,
        decisionType: decision,
        reason,
        evidenceFor: review.evidenceFor.filter((_, index) =>
          choices[review.id]!.for.includes(index),
        ),
        evidenceAgainst: review.evidenceAgainst.filter((_, index) =>
          choices[review.id]!.against.includes(index),
        ),
      })),
    },
  };
  const input = submitted ?? draft;
  const tooLarge =
    new TextEncoder().encode(JSON.stringify(input)).byteLength >
    researchDecisionRequestLimitBytes;
  const missingEvidence = draft.body.items.some(
    (item) =>
      ["include", "exclude", "dispute"].includes(item.decisionType) &&
      item.evidenceFor.length + item.evidenceAgainst.length === 0,
  );
  const refused =
    receiptError instanceof CapiroApiError &&
    [400, 403, 404, 409, 413, 422].includes(receiptError.status);
  const valid =
    available &&
    editable &&
    !action.pending &&
    !receipt &&
    !refused &&
    !tooLarge &&
    Boolean(
      submitted ||
      (selected.length > 0 &&
        selected.length <= 50 &&
        selected.length === Object.keys(choices).length &&
        reason.trim() &&
        !missingEvidence),
    );
  async function save() {
    if (!valid) return;
    setReceiptError(undefined);
    try {
      const exact =
        submitted ??
        researchPortfolioOperations["research.reviews.bulk"].request.parse(
          draft,
        );
      setSubmitted(exact);
      const result = await action.run(exact);
      const expected = new Set(exact.body.items.map((item) => item.reviewId));
      const received = result.outcomes.map((item) => item.reviewId);
      if (
        result.portfolioId !== portfolio.id ||
        received.length !== expected.size ||
        new Set(received).size !== expected.size ||
        received.some((id) => !id || !expected.has(id))
      )
        throw new Error(
          "The bulk receipt did not identify every selected review. Check the same request before making another decision.",
        );
      setReceipt(result);
    } catch (failure) {
      setReceiptError(
        failure instanceof Error
          ? failure
          : new Error("Bulk decision result is unconfirmed."),
      );
    }
  }
  function refresh() {
    if ((!receipt && !refused) || action.pending) return;
    setSubmitted(undefined);
    setReceipt(undefined);
    setReceiptError(undefined);
    setChoices({});
    setReason("");
    setKey(crypto.randomUUID());
    action.reset();
    onRefresh();
  }
  function choose(review: ResearchReview, checked: boolean) {
    setChoices((current) => {
      const next = { ...current };
      if (checked)
        next[review.id] = { revision: review.revision, for: [], against: [] };
      else delete next[review.id];
      return next;
    });
  }
  function evidence(id: string, stance: "for" | "against", indices: number[]) {
    setChoices((current) => ({
      ...current,
      [id]: { ...current[id]!, [stance]: indices },
    }));
  }
  return (
    <Panel
      title="Bulk review decisions"
      description="Select up to 50 current reviews. One decision and reason apply to each selected review; choose its evidence explicitly."
    >
      {!available ? (
        <p className={styles.content}>
          Read the current review queue to use bulk decisions. Any unconfirmed
          request is retained in this view.
        </p>
      ) : (
        <div className={`${styles.content} ${styles.form}`}>
          <StatusPanel error={receiptError || action.error} />
          {!submitted && (
            <>
              <DataTable
                rows={reviews}
                rowKey={(review) => review.id}
                caption="Select reviews for one bulk decision"
                columns={[
                  {
                    key: "select",
                    label: "Select",
                    render: (review) => (
                      <input
                        type="checkbox"
                        aria-label={`Select review ${review.targetId}`}
                        disabled={
                          locked ||
                          (Object.keys(choices).length >= 50 &&
                            !choices[review.id])
                        }
                        checked={Boolean(choices[review.id])}
                        onChange={(event) =>
                          choose(review, event.target.checked)
                        }
                      />
                    ),
                  },
                  {
                    key: "target",
                    label: "Subject",
                    render: (review) => review.targetId,
                  },
                  {
                    key: "revision",
                    label: "Revision",
                    render: (review) => review.revision,
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (review) => review.status,
                  },
                ]}
              />
              <Field label="Bulk decision" htmlFor="bulk-review-decision">
                <select
                  id="bulk-review-decision"
                  value={decision}
                  disabled={locked}
                  onChange={(event) =>
                    setDecision(event.target.value as typeof decision)
                  }
                >
                  {["include", "exclude", "defer", "reopen", "dispute"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field
                label="Reason for selected reviews"
                htmlFor="bulk-review-reason"
              >
                <TextArea
                  id="bulk-review-reason"
                  value={reason}
                  maxLength={4000}
                  disabled={locked}
                  onChange={(event) => setReason(event.target.value)}
                />
              </Field>
              {selected.map((review) => (
                <details key={review.id}>
                  <summary>
                    Evidence for {review.targetId} · revision {review.revision}
                  </summary>
                  <ResearchReviewEvidence
                    evidence={review.evidenceFor}
                    selected={choices[review.id]!.for}
                    disabled={locked}
                    onSelect={(indices) => evidence(review.id, "for", indices)}
                    stance="for"
                  />
                  <ResearchReviewEvidence
                    evidence={review.evidenceAgainst}
                    selected={choices[review.id]!.against}
                    disabled={locked}
                    onSelect={(indices) =>
                      evidence(review.id, "against", indices)
                    }
                    stance="against"
                  />
                </details>
              ))}
              {missingEvidence && (
                <p>
                  Select at least one recorded citation for every include,
                  exclude or dispute decision.
                </p>
              )}
              {Object.keys(choices).length !== selected.length && (
                <p>
                  Some selected reviews changed or are outside the current
                  queue. Clear this selection and select current reviews before
                  saving.
                </p>
              )}
              <ActionButton disabled={locked} onClick={() => setChoices({})}>
                Clear bulk selection
              </ActionButton>
            </>
          )}
          {submitted && (
            <>
              <p>
                {submitted.body.items.length} selected reviews ·{" "}
                {submitted.body.items[0]?.decisionType} · expected portfolio
                revision {submitted.body.expectedRevision}.
              </p>
              <p>{submitted.body.items[0]?.reason}</p>
            </>
          )}
          {tooLarge && (
            <p role="alert">
              The selected evidence exceeds the 1 MB decision limit. Select
              fewer reviews or citations; nothing is shortened.
            </p>
          )}
          {!receipt && (
            <ActionButton primary disabled={!valid} onClick={() => void save()}>
              {submitted
                ? "Check same bulk request"
                : "Apply selected decisions"}
            </ActionButton>
          )}
          {submitted && !receipt && !refused && !action.pending && (
            <p role="status">
              The outcome is unconfirmed. The exact request and key are
              retained; checking it cannot create another bulk decision.
            </p>
          )}
          {refused && (
            <>
              <p>
                The request was refused. Read the latest queue before preparing
                a corrected decision.
              </p>
              <ActionButton onClick={refresh}>
                Read latest review queue
              </ActionButton>
            </>
          )}
          {receipt && (
            <>
              <p role="status">
                {
                  receipt.outcomes.filter((item) => item.status === "decided")
                    .length
                }{" "}
                decided ·{" "}
                {
                  receipt.outcomes.filter((item) => item.status !== "decided")
                    .length
                }{" "}
                other outcomes. Read every result below.
              </p>
              <DataTable
                rows={receipt.outcomes}
                rowKey={(item) => item.reviewId!}
                caption="Bulk decision outcomes"
                columns={[
                  {
                    key: "review",
                    label: "Review",
                    render: (item) => item.reviewId,
                  },
                  {
                    key: "status",
                    label: "Outcome",
                    render: (item) => item.status,
                  },
                  {
                    key: "revision",
                    label: "Revision",
                    render: (item) => item.revision ?? "Not recorded",
                  },
                  {
                    key: "decision",
                    label: "Decision receipt",
                    render: (item) => item.decisionId ?? "No decision recorded",
                  },
                  {
                    key: "message",
                    label: "Details",
                    render: (item) => item.message ?? "—",
                  },
                ]}
              />
              <ActionButton onClick={refresh}>
                Read latest review queue
              </ActionButton>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
