import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { StateCardList, type StateCard } from "./StateCardList";

export type StateBoardView = {
  title: string;
  description: string;
  states: readonly StateCard[];
};

/** 11.01–11.05 state boards: every card is an alternate state of one flow. */
export function StateBoardScreen({
  view,
  actionHref,
  unavailable,
}: {
  view: StateBoardView;
  actionHref?: ((state: StateCard) => string | undefined) | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <StateCardList
        label={view.title}
        states={view.states}
        actionHref={actionHref}
        unavailable={unavailable}
      />
    </div>
  );
}
