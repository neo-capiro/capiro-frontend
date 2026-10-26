import { useState } from "react";
import type { NewsletterReviewerTeam } from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
} from "../../../../../shared/module-ui";
import { CommentComposer } from "./CommentComposer";
import { NewsletterSharing } from "./NewsletterSharing";
import { AccountInvitation } from "./AccountInvitation";
import { ReviewPreferences } from "./ReviewPreferences";
import { ThreadNotifications } from "./ThreadNotifications";
import { ReviewActionNotice } from "./ReviewActionNotice";
import type { NewsletterCollaborationState } from "./use-newsletter-collaboration";
import styles from "./newsletter-collaboration.module.css";

function MentionPicker({
  team,
  insert,
  disabled,
}: {
  team: NewsletterReviewerTeam;
  insert: (text: string) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState("");
  const person = team.items.find((item) => item.userId === selected);
  return (
    <div className={styles.stack}>
      <Field label="Mention a participant" htmlFor="review-mention">
        <SelectInput
          id="review-mention"
          value={selected}
          disabled={disabled}
          placeholder="Choose a participant"
          options={team.items.map((item) => ({
            value: item.userId,
            label: item.name || item.email,
          }))}
          onValueChange={setSelected}
        />
      </Field>
      <ActionButton
        disabled={disabled || !person}
        onClick={() => {
          if (person) insert(`@${person.name || person.email}`);
        }}
      >
        Insert mention
      </ActionButton>
    </div>
  );
}

export function ReviewCollaborationDialogs({
  state,
  documentId,
  canComment,
  onAccessLost,
}: {
  state: NewsletterCollaborationState;
  documentId: string;
  canComment: boolean;
  onAccessLost: () => void;
}) {
  const { actions, team, dialog } = state;
  if (!dialog) return null;
  const notifications = (
    <ThreadNotifications
      key={state.rootId ?? "new"}
      documentId={documentId}
      rootId={state.rootId}
      actions={actions}
      onAccessLost={onAccessLost}
      onClose={
        dialog === "compose"
          ? () => state.setChoosingNotifications(false)
          : state.close
      }
      {...(dialog === "compose"
        ? {
            onSelect: state.setNotifyUserIds,
            initialSelection: state.notifyUserIds,
          }
        : {})}
    />
  );
  if (dialog === "watchers") return canComment ? notifications : null;
  if (dialog === "compose")
    return canComment ? (
      <>
        <CommentComposer
          parent={state.parent}
          busy={actions.pending}
          blocked={actions.blocked}
          onClose={state.close}
          onSubmit={state.post}
        >
          {(insert) => (
            <>
              <ReviewActionNotice actions={actions} />
              {team.loading ? (
                <p role="status">Loading participants…</p>
              ) : team.team ? (
                <MentionPicker
                  team={team.team}
                  insert={insert}
                  disabled={actions.blocked}
                />
              ) : (
                <p>
                  Participants could not be loaded. You can still write plain
                  text.
                </p>
              )}
              <p className={styles.hint}>
                {state.notifyUserIds
                  ? `${state.notifyUserIds.length} selected for thread email notifications.`
                  : state.parent
                    ? "Existing thread email choices stay unchanged."
                    : "New threads default to notifying only you."}{" "}
                Delivery status is unavailable here.
              </p>
              <ActionButton
                disabled={actions.blocked}
                onClick={() => state.setChoosingNotifications(true)}
              >
                Choose email notifications
              </ActionButton>
            </>
          )}
        </CommentComposer>
        {state.choosingNotifications && notifications}
      </>
    ) : null;
  if (dialog === "account" && state.account)
    return (
      <AccountInvitation
        key={state.account.id}
        target={state.account}
        canInviteAccounts={Boolean(
          team.team?.canInviteAccounts && team.team.role === "owner",
        )}
        actions={actions}
        onAccessLost={onAccessLost}
        onClose={state.backToSharing}
      />
    );
  if (!team.team)
    return (
      <Modal
        open
        onOpenChange={(open) => {
          if (!open) state.close();
        }}
        title={
          dialog === "sharing" ? "Newsletter sharing" : "In-app notifications"
        }
        className={styles.dialog}
        footer={<ActionButton onClick={state.close}>Close</ActionButton>}
      >
        <p role={team.loading ? "status" : "alert"}>
          {team.loading
            ? "Loading current participants…"
            : "Participants could not be loaded."}
        </p>
        {!team.loading && (
          <ActionButton onClick={team.open}>Refresh participants</ActionButton>
        )}
      </Modal>
    );
  if (dialog === "preferences")
    return (
      <ReviewPreferences
        team={team.team}
        documentId={documentId}
        actions={actions}
        onTeam={team.apply}
        onClose={state.close}
      />
    );
  return (
    <NewsletterSharing
      documentId={documentId}
      team={team.team}
      actions={actions}
      onTeam={team.apply}
      onAccount={state.openAccount}
      onClose={state.close}
    />
  );
}
