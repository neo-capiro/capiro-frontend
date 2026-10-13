import type { EngagementMeeting } from "../capiro/operations/engagement";
import { Badge, Panel, UnavailableAction } from "../module-ui";
import styles from "./meetings.module.css";

export function MeetingPreparation({
  meeting,
}: {
  meeting: EngagementMeeting;
}) {
  if (!meeting.preps?.length)
    return (
      <Panel>
        <div className={styles.artifact}>
          <p>No preparation is available for this meeting.</p>
          <UnavailableAction reason="Preparation generation needs the new Meri service integration.">
            Generate preparation
          </UnavailableAction>
        </div>
      </Panel>
    );
  return (
    <div className={styles.stack}>
      {meeting.preps.map((prep) => (
        <Panel title="Meeting preparation" key={prep.id}>
          <div className={styles.artifact}>
            <Badge>{prep.status}</Badge>
            <p className={styles.body}>{prep.summary}</p>
            {(["agenda", "talkingPoints", "risks", "followUps"] as const).map(
              (key) =>
                Array.isArray(prep[key]) ? (
                  <div key={key}>
                    <h3>{key.replace(/([A-Z])/g, " $1")}</h3>
                    <ul className={styles.prepList}>
                      {prep[key].map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
