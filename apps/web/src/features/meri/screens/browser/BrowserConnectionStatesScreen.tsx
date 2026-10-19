import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import styles from "./browser.module.css";

export type BrowserConnectionState = {
  title: string;
  detail: string;
  tone: "warning" | "danger";
  action: string;
  href?: string;
};

/** 07.04 Browser connection states: specific recovery for each site or connection failure. */
export function BrowserConnectionStatesScreen({
  states,
  unavailable,
}: {
  states: readonly BrowserConnectionState[];
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Browser status and recovery"
        description="Specific messages for site and connection failures"
      />
      <div className={styles.notices}>
        {states.map((state) => (
          <Notice
            key={state.title}
            tone={state.tone}
            title={state.title}
            action={
              <LinkAction
                variant="outline"
                href={state.href}
                unavailable={unavailable}
              >
                {state.action}
              </LinkAction>
            }
          >
            {state.detail}
          </Notice>
        ))}
      </div>
    </div>
  );
}
