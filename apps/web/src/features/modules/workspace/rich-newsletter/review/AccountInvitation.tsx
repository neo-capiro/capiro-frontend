"use client";
import { useEffect, useMemo, useState } from "react";
import {
  parseNewsletterAccountInvitationReceipt,
  type NewsletterAccountInvitationReceipt,
} from "@capiro/shared/newsletter";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { ActionButton, Modal } from "../../../../../shared/module-ui";
import { isReviewAccessLoss, type ReviewActions } from "./use-review-actions";
import type { AccountTarget } from "./NewsletterSharing";
import { ReviewActionNotice } from "./ReviewActionNotice";
import { ScopedLink } from "../../../../../shared/shell/ScopedLink";
import styles from "./newsletter-collaboration.module.css";

export function AccountInvitation({
  target,
  canInviteAccounts,
  actions,
  onAccessLost,
  onClose,
}: {
  target: AccountTarget;
  canInviteAccounts: boolean;
  actions: ReviewActions;
  onAccessLost: () => void;
  onClose: () => void;
}) {
  const [requested, setRequested] = useState(false);
  const [written, setWritten] = useState<NewsletterAccountInvitationReceipt>();
  const query = useCapiroQuery(
    "workspace.richNewsletter.accountInvitationRead",
    { params: { invitationId: target.id } },
    { enabled: requested },
  );
  const result = useMemo(
    () =>
      parseNewsletterAccountInvitationReceipt(query.data, {
        invitationId: target.id,
      }),
    [query.data, target.id],
  );
  const receipt =
    written ??
    (requested && !query.loading && !query.error && result.ok
      ? result.value
      : undefined);
  useEffect(() => {
    if (isReviewAccessLoss(query.error)) onAccessLost();
  }, [query.error, onAccessLost]);
  useEffect(() => {
    if (requested && !query.loading && !query.error && result.ok)
      actions.acceptAccountStatus(result.value);
  }, [requested, query.loading, query.error, result, actions]);
  const check = () => {
    setWritten(undefined);
    if (requested) query.reload();
    else setRequested(true);
  };
  const dispatch = () => {
    if (!receipt?.canRetry || !canInviteAccounts) return;
    // Discard the pre-dispatch retry flag. Only a fresh bound receipt can permit another attempt.
    setWritten(undefined);
    setRequested(false);
    void actions.perform(
      "Firm invitation",
      () =>
        actions.dispatch.run({ params: { invitationId: target.id }, body: {} }),
      (raw) =>
        parseNewsletterAccountInvitationReceipt(raw, {
          invitationId: target.id,
        }),
      setWritten,
      false,
      false,
      target.id,
    );
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !actions.pending) onClose();
      }}
      closeDisabled={actions.pending}
      title="Firm invitation status"
      description={target.email}
      className={styles.dialog}
      footer={
        <>
          <ActionButton disabled={actions.pending} onClick={onClose}>
            Back to sharing
          </ActionButton>
          <ActionButton
            disabled={query.loading || actions.pending}
            onClick={check}
          >
            Check firm invitation
          </ActionButton>
          <ActionButton
            primary
            disabled={
              actions.blocked ||
              query.loading ||
              !receipt?.canRetry ||
              !canInviteAccounts
            }
            onClick={dispatch}
          >
            Send firm invitation
          </ActionButton>
        </>
      }
    >
      <div className={styles.stack} data-design-node="1176:300707">
        <ReviewActionNotice actions={actions} />
        <div className={styles.card}>
          <h3>Firm account: {receipt?.accountRole ?? target.accountRole}</h3>
          <p>
            Sending can create a firm invitation
            {target.accountRole === "admin"
              ? " or promote an existing member to Admin"
              : ""}
            . This is separate from newsletter access.
          </p>
          {query.loading ? (
            <p role="status">Checking the saved firm invitation…</p>
          ) : receipt ? (
            <div role="status">
              <strong>{receipt.status.replaceAll("_", " ")}</strong>
              <p>{receipt.message}</p>
            </div>
          ) : requested ? (
            <p role="alert">
              The firm invitation status could not be verified. Check again; no
              invitation was automatically sent.
            </p>
          ) : (
            <p>
              Check this saved request before sending. Checking may reconcile
              its existing provider status.
            </p>
          )}
          <p className={styles.hint}>
            Invited, reused or member ready does not confirm email delivery or
            newsletter access. Unknown outcomes must be checked, never
            automatically resent.
          </p>
          <p className={styles.hint}>
            <ScopedLink href="/settings/team">
              Manage users in Settings
            </ScopedLink>
            . Cancelling newsletter access does not remove firm membership.
          </p>
        </div>
      </div>
    </Modal>
  );
}
