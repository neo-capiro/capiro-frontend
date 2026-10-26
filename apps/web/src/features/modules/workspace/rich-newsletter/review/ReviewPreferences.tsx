"use client";
import { useState } from "react";
import {
  parseNewsletterReviewerTeam,
  type NewsletterReviewerTeam,
  type NewsletterNotificationMode,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
} from "../../../../../shared/module-ui";
import type { ReviewActions } from "./use-review-actions";
import { ReviewActionNotice } from "./ReviewActionNotice";
import styles from "./newsletter-collaboration.module.css";

export function ReviewPreferences({
  team,
  documentId,
  actions,
  onTeam,
  onClose,
}: {
  team: NewsletterReviewerTeam;
  documentId: string;
  actions: ReviewActions;
  onTeam: (team: NewsletterReviewerTeam) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<NewsletterNotificationMode>(
    team.items.find((row) => row.userId === team.currentUserId)
      ?.notifications ?? "all",
  );
  const choices = [
    { value: "all", label: "All comments" },
    { value: "mentions", label: "Mentions and replies" },
    { value: "none", label: "No comments" },
  ] as const;
  const save = async () => {
    if (
      await actions.perform(
        "In-app preference",
        () =>
          actions.preference.run({
            params: { id: documentId },
            body: { mode },
          }),
        (value) =>
          parseNewsletterReviewerTeam(value, {
            currentUserId: team.currentUserId,
          }),
        onTeam,
      )
    )
      onClose();
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !actions.pending) onClose();
      }}
      closeDisabled={actions.pending}
      title="In-app notifications"
      description="Your preference for this saved newsletter."
      className={styles.dialog}
      footer={
        <>
          <ActionButton disabled={actions.pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={actions.blocked}
            onClick={() => {
              void save();
            }}
          >
            Save preference
          </ActionButton>
        </>
      }
    >
      <div className={styles.stack} data-design-node="1176:300484">
        <ReviewActionNotice actions={actions} />
        <div className={styles.card}>
          <h3>Notify me about</h3>
          <Field label="Notification mode" htmlFor="review-preference">
            <SelectInput
              id="review-preference"
              value={mode}
              options={choices}
              disabled={actions.blocked}
              onValueChange={(value) => {
                if (value === "all" || value === "mentions" || value === "none")
                  setMode(value);
              }}
            />
          </Field>
        </div>
        <p className={styles.hint}>
          This changes only your in-app notifications. Thread email choices are
          separate.
        </p>
      </div>
    </Modal>
  );
}
