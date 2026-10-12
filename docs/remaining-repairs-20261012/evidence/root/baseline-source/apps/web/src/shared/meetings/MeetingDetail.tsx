"use client";
import { useState } from "react";
import type { EngagementMeeting } from "../capiro/operations/engagement";
import { useCapiroQuery } from "../capiro/queries";
import {
  Badge,
  Modal,
  Panel,
  StatusPanel,
  Tabs,
  UnavailableAction,
} from "../module-ui";
import { MeetingArtifacts } from "./MeetingArtifacts";
import styles from "./meetings.module.css";
export function MeetingDetail({
  meeting,
  onClose,
  onSaved,
}: {
  meeting: EngagementMeeting;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [tab, setTab] = useState("notes");
  const detail = useCapiroQuery("engagement.meeting", {
    params: { id: meeting.id },
  });
  const current = detail.data ?? meeting;
  const reload = () => {
    detail.reload();
    onSaved?.();
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={current.subject}
      description={`${current.client?.name ?? "Unassigned"} · ${new Date(current.startsAt).toLocaleString()} · ${current.location ?? "Location not specified"}`}
    >
      <div className={styles.stack}>
        <div className={styles.metadata}>
          <Badge>{current.status}</Badge>
          <Badge>{current.visibility ?? "private"}</Badge>
          <span className={styles.muted}>{current.description}</span>
        </div>
        <Tabs
          items={[
            { id: "prep", label: "Prep" },
            { id: "notes", label: "Meeting Notes" },
            { id: "debrief", label: "Debrief" },
          ]}
          value={tab}
          onChange={setTab}
          label="Meeting materials"
        />
        {tab === "prep" ? (
          <StatusPanel
            loading={detail.loading}
            error={detail.error}
            onRetry={detail.reload}
          >
            {current.preps?.length ? (
              <div className={styles.stack}>
                {current.preps.map((prep) => (
                  <Panel title="Meeting preparation" key={prep.id}>
                    <div className={styles.artifact}>
                      <Badge>{prep.status}</Badge>
                      <p className={styles.body}>{prep.summary}</p>
                      {(
                        [
                          "agenda",
                          "talkingPoints",
                          "risks",
                          "followUps",
                        ] as const
                      ).map((key) =>
                        Array.isArray(prep[key]) ? (
                          <div key={key}>
                            <h3>{key.replace(/([A-Z])/g, " $1")}</h3>
                            <ul className={styles.prepList}>
                              {(prep[key] as string[]).map((item, index) => (
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
            ) : (
              <Panel>
                <div className={styles.artifact}>
                  <p>No preparation is available for this meeting.</p>
                  <UnavailableAction reason="Preparation generation needs the new Meri service integration.">
                    Generate preparation
                  </UnavailableAction>
                </div>
              </Panel>
            )}
          </StatusPanel>
        ) : (
          <MeetingArtifacts
            key={tab}
            meetingId={current.id}
            kind={tab === "notes" ? "notes" : "debrief"}
            onSaved={reload}
          />
        )}
        <p className={styles.privacy}>
          Notes remain private until explicitly shared. Saving and approval are
          separate.
        </p>
      </div>
    </Modal>
  );
}
