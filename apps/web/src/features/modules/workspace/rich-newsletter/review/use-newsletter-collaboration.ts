"use client";
import { useState } from "react";
import {
  parseNewsletterComments,
  type NewsletterComments,
  type NewsletterReviewComment,
  type NewsletterReview,
} from "@capiro/shared/newsletter";
import { useReviewActions } from "./use-review-actions";
import { useReviewTeam } from "./use-review-team";
import type { AccountTarget } from "./NewsletterSharing";

export function useNewsletterCollaboration(
  documentId: string,
  actorId: string,
  onAccessLost: () => void,
  onComments: (value: NewsletterComments) => void,
  accessLost: boolean,
  reviewRole: NewsletterReview["role"] | undefined,
) {
  const actions = useReviewActions(onAccessLost);
  const team = useReviewTeam(documentId, actorId, onAccessLost);
  const [dialog, setDialog] = useState<
    "compose" | "sharing" | "preferences" | "watchers" | "account"
  >();
  const [parent, setParent] = useState<NewsletterReviewComment>();
  const [notifyUserIds, setNotifyUserIds] = useState<string[]>();
  const [choosingNotifications, setChoosingNotifications] = useState(false);
  const [account, setAccount] = useState<AccountTarget>();
  const clearTeam = team.clear;
  const clearRecovery = actions.clearRecovery;
  const revoke = actions.revoke;
  const currentRole =
    reviewRole &&
    (["viewer", "commenter", "editor", "owner"] as const).find(
      (value) => value === reviewRole || value === team.team?.role,
    );
  const [previousRole, setPreviousRole] = useState(currentRole);
  if (currentRole !== previousRole) {
    setPreviousRole(currentRole);
    if (currentRole && currentRole !== "owner") {
      clearRecovery();
      setAccount(undefined);
      if (dialog === "sharing" || dialog === "account") setDialog(undefined);
    }
    if (
      currentRole === "viewer" &&
      (dialog === "compose" || dialog === "watchers")
    )
      setDialog(undefined);
  }
  const [previousAccessLost, setPreviousAccessLost] = useState(accessLost);
  if (accessLost !== previousAccessLost) {
    setPreviousAccessLost(accessLost);
    if (accessLost) {
      setDialog(undefined);
      setParent(undefined);
      setAccount(undefined);
      setNotifyUserIds(undefined);
      setChoosingNotifications(false);
      clearTeam();
      revoke();
    }
  }
  const rootId = parent ? (parent.parentId ?? parent.id) : null;
  return {
    actions,
    currentRole,
    team,
    dialog,
    parent,
    account,
    rootId,
    notifyUserIds,
    choosingNotifications,
    setChoosingNotifications,
    setNotifyUserIds,
    close() {
      if (!actions.pending) setDialog(undefined);
    },
    compose(comment?: NewsletterReviewComment) {
      setParent(comment);
      setNotifyUserIds(undefined);
      setChoosingNotifications(false);
      team.open();
      setDialog("compose");
    },
    openTeam(kind: "sharing" | "preferences") {
      team.open();
      setDialog(kind);
    },
    openWatchers(comment: NewsletterReviewComment) {
      setParent(comment);
      setDialog("watchers");
    },
    openAccount(target: AccountTarget) {
      setAccount(target);
      setDialog("account");
    },
    backToSharing() {
      setDialog("sharing");
    },
    async post(message: string) {
      const body = {
        message,
        ...(parent ? { parentId: rootId! } : {}),
        ...(notifyUserIds ? { notifyUserIds: [...notifyUserIds] } : {}),
      };
      const ok = await actions.perform(
        parent ? "Reply" : "Comment",
        () => actions.comment.run({ params: { id: documentId }, body }),
        (value) => parseNewsletterComments(value, { documentId }),
        onComments,
      );
      if (ok) setDialog(undefined);
      return ok;
    },
    resolve(comment: NewsletterReviewComment) {
      void actions.perform(
        comment.resolved ? "Reopen comment" : "Resolve comment",
        () =>
          actions.resolve.run({
            params: { id: documentId, commentId: comment.id },
            body: { resolved: !comment.resolved },
          }),
        (value) => parseNewsletterComments(value, { documentId }),
        onComments,
      );
    },
  };
}
export type NewsletterCollaborationState = ReturnType<
  typeof useNewsletterCollaboration
>;
