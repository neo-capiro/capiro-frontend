import type { EngagementMeeting } from "../capiro/operations/engagement";
import { Badge, Panel, UnavailableAction } from "../module-ui";
import styles from "./meetings.module.css";

export function MeetingPreparation({
  meeting,
  inline = false,
}: {
  meeting: EngagementMeeting;
  inline?: boolean;
}) {
  if (!meeting.preps?.length)
    return (
      <Panel>
        <div className={styles.artifact}>
          <p>
            {meeting.preps === undefined
              ? "Preparation details were not supplied for this meeting."
              : "No preparation is available for this meeting."}
          </p>
          <UnavailableAction reason="Preparation generation needs the new Meri service integration.">
            Generate preparation
          </UnavailableAction>
        </div>
      </Panel>
    );
  return (
    <div
      className={`${styles.stack} ${inline ? styles.inlinePreparations : ""}`}
    >
      {meeting.preps.map((prep) => (
        <Panel title={inline ? undefined : "Meeting preparation"} key={prep.id}>
          <div className={styles.artifact}>
            <Badge>{prep.status}</Badge>
            <div className={styles.prepSection}>
              {inline && <h3>Summary</h3>}
              <p className={styles.body}>{prep.summary}</p>
            </div>
            {(
              [
                ["agenda", "Agenda"],
                ["talkingPoints", "Talking points"],
                ["risks", "Watch-outs"],
                ["followUps", "Follow-ups"],
              ] as const
            ).map(([key, label]) => {
              if (!Array.isArray(prep[key])) return null;
              const List = inline && key === "agenda" ? "ol" : "ul";
              return (
                <div className={styles.prepSection} key={key}>
                  <h3>{inline ? label : key.replace(/([A-Z])/g, " $1")}</h3>
                  <List className={styles.prepList}>
                    {prep[key].map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </List>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}
