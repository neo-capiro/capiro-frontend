"use client";
import { Panel, UnavailableAction } from "../../../shared/module-ui";
import styles from "./engagement.module.css";
const phases = [
  ["Build and validate", "Establish evidence, priorities and champions."],
  [
    "Request submission",
    "Coordinate the client request and submission window.",
  ],
  ["Committee consideration", "Track review and staff follow-through."],
  ["Floor and conference", "Protect priorities as proposals change."],
  ["Implementation", "Verify commitments and agency execution."],
];
export function PlanView() {
  return (
    <div className={styles.stack}>
      <div className={styles.phases}>
        {phases.map(([title, description]) => (
          <div className={styles.phase} key={title}>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        ))}
      </div>
      <div className={styles.split}>
        <Panel
          title="Waves across clients"
          description="Client plans, waves, formats and request windows."
        >
          <div className={styles.empty}>
            <h2>Engagement plans are not connected</h2>
            <p className={styles.muted}>
              The current frontend contract covers meetings, outreach and
              commitments. A plan and wave binding has not been verified for
              this view.
            </p>
            <UnavailableAction reason="A verified engagement-plan read/write contract is required.">
              + New engagement plan
            </UnavailableAction>
          </div>
        </Panel>
        <Panel
          title="Recommended DC windows"
          description="Coordinate shared trips across client plans."
        >
          <div className={styles.body}>
            <p className={styles.muted}>
              Recommendations require authorized plan data and congressional
              session dates.
            </p>
            <UnavailableAction reason="No reviewed scheduling recommendation endpoint is available.">
              Find a window
            </UnavailableAction>
          </div>
        </Panel>
      </div>
    </div>
  );
}
