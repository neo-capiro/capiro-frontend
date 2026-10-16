import ui from "../../ui/meri-ui.module.css";
import { WorkflowSetup, type WorkflowSetupView } from "./WorkflowSetup";
import styles from "./screens.module.css";

/** Setup · <workflow>: the shared setup form for one named workflow. */
export function WorkflowSetupScreen({
  setup,
  closeHref,
  continueHref,
  unavailable,
}: {
  setup: WorkflowSetupView;
  closeHref?: string | undefined;
  continueHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={`${ui.page} ${styles.setupPage}`}>
      <WorkflowSetup
        setup={setup}
        closeHref={closeHref}
        continueHref={continueHref}
        unavailable={unavailable}
      />
    </div>
  );
}
