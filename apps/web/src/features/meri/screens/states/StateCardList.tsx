import { LinkAction } from "../../ui/LinkAction";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./states.module.css";

/** One canonical alternate state: what happened, its severity and the recovery it offers. */
export type StateCard = {
  title: string;
  tone: StatusTone;
  explanation: string;
  action: string;
  /** Specific pill label (11.06, 11.07); otherwise the tone's fixed label. */
  status?: string;
};

/** Figma 3.4 11.xx pill vocabulary: each tone has one fixed label. */
const toneLabel: Record<StatusTone, string> = {
  neutral: "In progress",
  warning: "Attention",
  success: "Complete",
  danger: "Blocked",
};

/** Grid of state cards; a card's recovery action navigates only when a destination is supplied. */
export function StateCardList({
  label,
  states,
  actionHref,
  unavailable,
}: {
  label: string;
  states: readonly StateCard[];
  actionHref?: ((state: StateCard) => string | undefined) | undefined;
  unavailable: string;
}) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {states.map((state) => (
        <li key={state.title} className={styles.card}>
          <h2 className={surfaces.sectionTitle}>{state.title}</h2>
          <span
            className={state.status ? styles.statusSlot : surfaces.pillSlot}
          >
            <StatusPill tone={state.tone}>
              {state.status ?? toneLabel[state.tone]}
            </StatusPill>
          </span>
          <p className={styles.explanation}>{state.explanation}</p>
          <LinkAction
            variant="outline"
            href={actionHref?.(state)}
            unavailable={unavailable}
          >
            {state.action}
          </LinkAction>
        </li>
      ))}
    </ul>
  );
}
