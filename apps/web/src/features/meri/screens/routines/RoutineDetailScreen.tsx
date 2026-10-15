import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { LinkAction } from "../../ui/LinkAction";
import { Panel } from "../../ui/Panel";
import ui from "../../ui/meri-ui.module.css";
import { CancelRoutineDialog } from "./CancelRoutineDialog";
import styles from "./routines.module.css";

export type RoutineStat = { label: string; value: string; detail: string };
export type RoutineDetailView = {
  name: string;
  owner: string;
  summary: readonly RoutineStat[];
  configuration: readonly FieldRow[];
  editHref?: string;
  historyHref?: string;
};

/** 08.03 Routine detail: current state, configuration and controls for one routine. */
export function RoutineDetailScreen({
  view,
  unavailable,
}: {
  view: RoutineDetailView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.name} description={view.owner} />
      <dl className={styles.summary} aria-label="Routine summary">
        {view.summary.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
            <dd>{stat.detail}</dd>
          </div>
        ))}
      </dl>
      <Panel label="Routine configuration">
        <FieldTable
          caption={`${view.name} configuration`}
          fieldLabel="Configuration"
          rows={view.configuration}
        />
        <div className={ui.row}>
          <LinkAction
            variant="outline"
            href={view.editHref}
            unavailable={unavailable}
          >
            Edit routine
          </LinkAction>
          <button
            type="button"
            className={ui.outline}
            disabled
            title={unavailable}
          >
            Pause routine
          </button>
          <LinkAction
            variant="primary"
            href={view.historyHref}
            unavailable={unavailable}
          >
            View run history
          </LinkAction>
          <CancelRoutineDialog routine={view.name} unavailable={unavailable} />
        </div>
      </Panel>
    </div>
  );
}
