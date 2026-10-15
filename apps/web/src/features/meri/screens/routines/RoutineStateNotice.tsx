"use client";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { OutcomeToast } from "../../ui/OutcomeToast";
import ui from "../../ui/meri-ui.module.css";

type StateCopy = { title: string; body: string };
/** A routine's recorded lifecycle state; each non-active state is its own view. */
export type RoutineHistoryState =
  | { kind: "active" }
  | ({ kind: "paused" } & StateCopy)
  | ({ kind: "disabled"; reviewAccessHref?: string } & StateCopy)
  | ({ kind: "cancelled"; createHref?: string } & StateCopy);

/** Paused, automatically disabled or cancelled notice; resuming stays a trusted schedule-owner action. */
export function RoutineStateNotice({
  state,
  unavailable,
}: {
  state: RoutineHistoryState;
  unavailable: string;
}) {
  const disabled = { disabled: true, title: unavailable } as const;
  switch (state.kind) {
    case "active":
      return null;
    case "paused":
      return (
        <>
          <Notice
            tone="warning"
            title={state.title}
            action={
              <button type="button" className={ui.primary} {...disabled}>
                Resume routine
              </button>
            }
          >
            {state.body}
          </Notice>
          <OutcomeToast
            title="Routine paused"
            detail="No future run is queued. Past outputs remain available."
            status="Paused"
            tone="warning"
            dismissLabel="Keep paused"
            action={
              <button type="button" className={ui.primary} {...disabled}>
                Resume routine
              </button>
            }
          />
        </>
      );
    case "disabled":
      return (
        <Notice
          tone="danger"
          title={state.title}
          action={
            <LinkAction
              variant="outline"
              href={state.reviewAccessHref}
              unavailable={unavailable}
            >
              Review current access
            </LinkAction>
          }
        >
          {state.body}
        </Notice>
      );
    case "cancelled":
      return (
        <Notice
          tone="warning"
          title={state.title}
          action={
            <LinkAction
              variant="outline"
              href={state.createHref}
              unavailable={unavailable}
            >
              Create another routine
            </LinkAction>
          }
        >
          {state.body}
        </Notice>
      );
  }
}
