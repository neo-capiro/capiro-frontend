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
  /** A recorded outcome shown as the Figma "Conversation deleted" toast. */
  outcome?: { title: string; detail: string };
};

/** Background-run notice and the recorded deletion outcome below the history list. */
export function HistoryFollowUps({
  view,
  visibleIds,
  unavailable,
  onOpenHistory,
}: {
  view: HistoryFollowUpView;
  visibleIds: readonly string[];
  unavailable: string;
  onOpenHistory: () => void;
}) {
  const [outcome, setOutcome] = useState(view.outcome);
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
            onDismiss={() => setOutcome(undefined)}
          >
            <button
              type="button"
              className={ui.outline}
              onClick={() => {
                setOutcome(undefined);
                onOpenHistory();
              }}
            >
              Open history
            </button>
          </ToastCard>
        ) : null}
      </ToastRegion>
    </>
  );
}
