"use client";
import { useState } from "react";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { ToastCard, ToastRegion } from "../../ui/ToastCard";
import ui from "../../ui/meri-ui.module.css";

export type HistoryFollowUpView = {
  /** Shown while the conversation whose run continues in the background is listed. */
  background?: {
    conversationId: string;
    title: string;
    detail: string;
    runsHref?: string;
  };
  /** A recorded outcome shown as Overlay · Conversation deleted; Dismiss closes it. */
  outcome?: { title: string; detail: string };
};

/** Background-run notice and the recorded deletion outcome below the history list. */
export function HistoryFollowUps({
  view,
  visibleIds,
  unavailable,
  onOutcomeClosed,
}: {
  view: HistoryFollowUpView;
  visibleIds: readonly string[];
  unavailable: string;
  /** Returns focus to the history list once the toast holding it closes. */
  onOutcomeClosed: () => void;
}) {
  const [outcome, setOutcome] = useState(view.outcome);
  const close = () => {
    setOutcome(undefined);
    onOutcomeClosed();
  };
  const background =
    view.background && visibleIds.includes(view.background.conversationId)
      ? view.background
      : undefined;
  return (
    <>
      {background ? (
        <Notice
          tone="success"
          title={background.title}
          action={
            <LinkAction
              variant="outline"
              href={background.runsHref}
              unavailable={unavailable}
            >
              View runs
            </LinkAction>
          }
        >
          {background.detail}
        </Notice>
      ) : null}
      <ToastRegion>
        {outcome ? (
          <ToastCard
            title={outcome.title}
            detail={outcome.detail}
            icon="success"
            onDismiss={close}
          >
            <button type="button" className={ui.outline} onClick={close}>
              Dismiss
            </button>
          </ToastCard>
        ) : null}
      </ToastRegion>
    </>
  );
}
