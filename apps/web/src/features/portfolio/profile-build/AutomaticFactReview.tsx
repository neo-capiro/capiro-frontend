"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ProfileFact } from "./fact-contracts";
import { profileBuildKey, type ProfileSubject } from "./subject";
import { isAutomaticFinding } from "./automatic-acceptance";
import {
  loadRun,
  useProfileBuildAccess,
  isProfileAccessDenied,
} from "./queries";
import { useReviewAction } from "./useReviewAction";
import { ReviewFeedback } from "./ReviewFeedback";
export function AutomaticFactReview({
  subject,
  fact,
  onClose,
}: {
  subject: ProfileSubject;
  fact: ProfileFact;
  onClose: () => void;
}) {
  const api = useApi();
  const { identity, canRead, canEdit } = useProfileBuildAccess();
  const actor = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
  };
  const action = useReviewAction(subject, true, actor, canRead);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: [
      ...profileBuildKey(subject),
      "automatic-fact-review",
      fact.runId,
      actor.tenantId,
      actor.userId,
    ],
    enabled: canRead && Boolean(fact.runId),
    retry: false,
    queryFn: ({ signal }) => loadRun(api, subject, fact.runId!, signal),
  });
  const readable =
    canRead &&
    query.isSuccess &&
    !query.error &&
    !isProfileAccessDenied(action.mutation.error) &&
    !isProfileAccessDenied(action.recovery.error) &&
    !action.readError;
  const finding = readable
    ? query.data?.findings.find((row) => row.id === fact.findingId)
    : undefined;
  const busy =
    action.mutation.isPending ||
    action.recovery.isPending ||
    action.checkingRecovery ||
    action.uncertain ||
    query.isFetching;
  return (
    <Dialog
      open
      title="Mark this fact not right?"
      onOpenChange={(open) => {
        if (!open && !action.mutation.isPending) onClose();
      }}
    >
      <p>
        This records your rejection. The automatic value is removed only if it
        is still current; later edits stay saved.
      </p>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <ReviewFeedback
        action={action}
        findings={readable ? (query.data?.findings ?? []) : []}
        canEdit={canEdit && readable}
        canPresent={readable}
        onRecovered={() => void query.refetch()}
      />
      {readable && (
        <>
          <label>
            Reason (optional)
            <textarea
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={busy || !canEdit}
            />
          </label>
          {!finding && (
            <p role="status">
              The original finding is no longer available to this session.
            </p>
          )}
          {finding && !isAutomaticFinding(finding) && (
            <p role="status">
              This finding has changed. Refresh the profile to review its
              current state.
            </p>
          )}
          <button
            className="button"
            disabled={
              busy || !canEdit || !finding || !isAutomaticFinding(finding)
            }
            onClick={() => {
              if (query.data && finding)
                action.mutation.mutate(
                  {
                    review: query.data,
                    action: {
                      kind: "reject",
                      findingId: finding.id,
                      reason,
                      automatic: true,
                    },
                  },
                  { onSuccess: onClose },
                );
            }}
          >
            Confirm not right
          </button>
        </>
      )}
    </Dialog>
  );
}
