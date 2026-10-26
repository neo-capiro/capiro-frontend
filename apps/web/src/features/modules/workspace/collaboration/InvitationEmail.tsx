"use client";

import { useEffect, useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { CollaboratorEmailReceipt } from "../../../../shared/capiro/operations/workspace-collaborators";
import { ActionButton, StatusPanel } from "../../../../shared/module-ui";
import { accessRefused } from "./use-collaboration";
import styles from "./collaboration.module.css";

const descriptions: Record<
  CollaboratorEmailReceipt["status"],
  [string, string, string]
> = {
  not_requested: [
    "Email not requested",
    "The invitation is saved in Capiro. You can separately request one email notification.",
    "Cancelling the email request keeps the document invitation in place.",
  ],
  claimed: [
    "Email request recorded",
    "The request has been recorded. Check status to see its current outcome.",
    "Cancellation can succeed only before submission begins.",
  ],
  sending: [
    "Email is being submitted",
    "The request is being submitted to the email provider.",
    "It cannot be recalled. Checking status will not send another email.",
  ],
  accepted: [
    "Accepted by email provider",
    "The email provider accepted this notification. Delivery has not been confirmed.",
    "This saved result belongs to the original invitation. No new email will be sent.",
  ],
  disabled: [
    "Email notifications disabled",
    "No email was requested from the provider for this invitation.",
    "This result will remain disabled if email settings change.",
  ],
  failed: [
    "Email request failed",
    "The provider did not accept this notification.",
    "This saved request will not be retried.",
  ],
  cancelled: [
    "Email request cancelled",
    "The email request has been cancelled.",
    "Cancelling an email request does not remove the document invitation.",
  ],
  outcome_unknown: [
    "Email outcome unknown",
    "An email may have been sent. Checking status will not send another email.",
    "Do not retry this notification. The original request remains recorded.",
  ],
};

export function InvitationEmail({
  draftId,
  invitationId,
  name,
  pendingInvitation,
  onRefused,
}: {
  draftId: string;
  invitationId: string;
  name: string;
  pendingInvitation: boolean;
  onRefused: (error: unknown) => void;
}) {
  const params = { draftId, invitationId };
  const query = useCapiroQuery("workspace.collaborator.email.status", {
    params,
  });
  const request = useCapiroMutation("workspace.collaborator.email.request");
  const cancel = useCapiroMutation("workspace.collaborator.email.cancel");
  const [uncertain, setUncertain] = useState(false);
  const [failure, setFailure] = useState<Error>();
  const receipt = query.data;
  const matched =
    receipt?.draftId === draftId && receipt.invitationId === invitationId;
  const error =
    query.error ??
    (receipt && !matched
      ? new Error("The email result does not match this invitation.")
      : undefined);
  useEffect(() => {
    if (accessRefused(query.error)) onRefused(query.error);
  }, [query.error, onRefused]);
  const busy = request.pending || cancel.pending;
  async function act(action: "request" | "cancel") {
    if (!matched || busy) return;
    setFailure(undefined);
    try {
      const saved =
        action === "request"
          ? await request.run({ body: params })
          : await cancel.run({ params });
      if (saved.draftId !== draftId || saved.invitationId !== invitationId)
        throw new CapiroApiError(
          502,
          "The email action could not be matched to this invitation.",
        );
      setUncertain(false);
      query.reload();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setUncertain(true);
      setFailure(
        new Error(
          "The email action was not confirmed. Check the saved status; do not send again.",
        ),
      );
      if (accessRefused(error)) onRefused(error);
      query.reload();
    }
  }
  const status = receipt?.status;
  const copy = status ? descriptions[status] : undefined;
  return (
    <section
      className={styles.card}
      aria-label={`Email notification for ${name}`}
      data-design-node="3153:116473"
    >
      <p className={styles.caption}>Email notification · {name}</p>
      <StatusPanel loading={query.loading} error={error} onRetry={query.reload}>
        {copy && matched && (
          <>
            <h3>{copy[0]}</h3>
            <p>
              {status === "not_requested" && !pendingInvitation
                ? "This invitation is no longer pending. No email notification can be requested."
                : copy[1]}
            </p>
            <p className={styles.caption}>{copy[2]}</p>
            {failure && <p role="alert">{failure.message}</p>}
            <div className={styles.actions}>
              {(status !== "not_requested" ||
                uncertain ||
                !pendingInvitation) && (
                <ActionButton
                  type="button"
                  disabled={busy}
                  onClick={query.reload}
                >
                  Check status
                </ActionButton>
              )}
              {(status === "claimed" ||
                (status === "not_requested" && pendingInvitation)) && (
                <ActionButton
                  type="button"
                  disabled={busy}
                  onClick={() => void act("cancel")}
                >
                  Cancel email request
                </ActionButton>
              )}
              {status === "not_requested" &&
                pendingInvitation &&
                !uncertain && (
                  <ActionButton
                    type="button"
                    primary
                    disabled={busy}
                    onClick={() => void act("request")}
                  >
                    {request.pending
                      ? "Requesting…"
                      : "Send email notification"}
                  </ActionButton>
                )}
            </div>
            {busy && <p role="status">Recording email action…</p>}
          </>
        )}
      </StatusPanel>
    </section>
  );
}
