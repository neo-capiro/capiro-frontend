"use client";
import { useState } from "react";
import type {
  MemoryReviewDetail,
  MemoryReviewApproveResponse,
  MemoryReviewRejectResponse,
} from "@capiro/shared/memory-review";
import { useSettingsMutation } from "../../settings/useSettingsMutation";
import { SettingsMutationNotice } from "../../settings/SettingsMutationNotice";
import { SettingsButton, SettingsNotice } from "../../settings/components";

/** The immutable candidate ID names the reviewed content and revision. Core owns eligibility. */
export function MemoryReviewActions({
  review,
  refresh,
}: {
  review: MemoryReviewDetail;
  refresh: () => void;
}) {
  const writer = useSettingsMutation("memory-review");
  const [choice, choose] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [confirmed, confirm] = useState(false);
  const eligible = review.capabilities[choice];
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            writer.locked ||
            !eligible ||
            !confirmed ||
            (choice === "reject" && !reason.trim())
          )
            return;
          const params = {
            id: review.candidateId,
            requestId: review.reviewRequestId,
          };
          void writer.action.run<
            MemoryReviewApproveResponse | MemoryReviewRejectResponse
          >(
            (signal) =>
              choice === "approve"
                ? writer.api.request(
                    "settings.memory.review.approve",
                    { params },
                    { signal },
                  )
                : writer.api.request(
                    "settings.memory.review.reject",
                    { params, body: { reason: reason.trim() } },
                    { signal },
                  ),
            (result) => `Review outcome: ${result.outcome}.`,
            refresh,
          );
        }}
      >
        <fieldset disabled={writer.locked}>
          <legend>Decision on revision {review.revisionNumber}</legend>
          <label>
            Decision{" "}
            <select
              value={choice}
              onChange={(event) => {
                choose(event.target.value as typeof choice);
                confirm(false);
              }}
            >
              <option value="approve" disabled={!review.capabilities.approve}>
                Approve reviewed proposal
              </option>
              <option value="reject" disabled={!review.capabilities.reject}>
                Reject proposal
              </option>
            </select>
          </label>
          {choice === "reject" && (
            <label>
              Rejection reason{" "}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={2000}
                required
              />
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => confirm(event.target.checked)}
            />{" "}
            I reviewed this exact proposal and scope.
          </label>
          <SettingsButton
            type="submit"
            disabled={
              !eligible || !confirmed || (choice === "reject" && !reason.trim())
            }
          >
            Record decision
          </SettingsButton>
        </fieldset>
      </form>
      {!review.capabilities.approve && !review.capabilities.reject && (
        <p>
          No decision is currently permitted. Core checks current access,
          reviewer assignment and item state.
        </p>
      )}
      <SettingsMutationNotice
        pending={writer.pending}
        busy={writer.action.busy}
        reconcile={() => void writer.reconcile().then(refresh)}
      />
      {writer.action.error && (
        <SettingsNotice error title="Decision not confirmed">
          {writer.action.error}
        </SettingsNotice>
      )}
      {writer.action.message && (
        <SettingsNotice title={writer.action.message} />
      )}
    </>
  );
}
