import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import type { ActionSpec } from "./types";
import tooling from "./tooling.module.css";

/** Row of navigation actions; each action without a destination is an explained disabled control. */
export function ActionRow({
  label,
  actions,
  unavailable,
}: {
  label: string;
  actions: readonly ActionSpec[];
  unavailable: string;
}) {
  return (
    <div className={ui.row} role="group" aria-label={label}>
      {actions.map((action) =>
        action.blocked ? (
          <button
            key={action.label}
            type="button"
            className={`${ui[action.variant]} ${tooling.blocked}`}
            disabled
            title={unavailable}
          >
            {action.label}
          </button>
        ) : (
          <LinkAction
            key={action.label}
            variant={action.variant}
            href={action.href}
            unavailable={unavailable}
          >
            {action.label}
          </LinkAction>
        ),
      )}
    </div>
  );
}
