"use client";
import { useState } from "react";
import type { EngagementMeeting } from "../capiro/operations/engagement";
import { useCapiroQuery } from "../capiro/queries";
import { Modal, StatusPanel, Tabs } from "../module-ui";
import { MeetingArtifacts } from "./MeetingArtifacts";
import { MeetingDetailHeader } from "./MeetingDetailHeader";
import { MeetingPreparation } from "./MeetingPreparation";
import styles from "./meetings.module.css";

export function MeetingDetail({
  meeting,
  onClose,
  onSaved,
  presentation = "modal",
}: {
  meeting: EngagementMeeting;
  onClose: () => void;
  onSaved?: () => void;
  presentation?: "modal" | "inline";
}) {
  const inline = presentation === "inline";
  const [tab, setTab] = useState(inline ? "prep" : "notes");
  const detail = useCapiroQuery("engagement.meeting", {
    params: { id: meeting.id },
  });
  const mismatch =
    detail.data &&
    (detail.data.id !== meeting.id ||
      (meeting.client !== undefined &&
        detail.data.client?.id !== meeting.client?.id));
  const current = mismatch ? undefined : detail.data;
  const error = mismatch
    ? "The meeting response does not match the selected meeting. Reload to confirm access."
    : detail.error;
  const reload = () => {
    detail.reload();
    onSaved?.();
  };
  const content = (
    <div className={styles.stack}>
      <MeetingDetailHeader
        meeting={meeting}
        current={current}
        inline={inline}
        onClose={onClose}
      />
      <StatusPanel
        loading={detail.loading}
        error={error}
        onRetry={detail.reload}
      >
        {current && (
          <>
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
              <MeetingPreparation meeting={current} inline={inline} />
            ) : (
              <MeetingArtifacts
                key={`${current.id}:${tab}`}
                meetingId={current.id}
                kind={tab === "notes" ? "notes" : "debrief"}
                onSaved={reload}
              />
            )}
            <p className={styles.privacy}>
              Notes remain private until explicitly shared. Saving and approval
              are separate.
            </p>
          </>
        )}
      </StatusPanel>
    </div>
  );
  if (inline)
    return (
      <section
        className={styles.inlineDetail}
        aria-label="Selected meeting"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            onClose();
          }
        }}
      >
        {content}
      </section>
    );
  const displayed = current ?? meeting;
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={displayed.subject}
      description={`${displayed.client?.name ?? "Unassigned"} · ${new Date(displayed.startsAt).toLocaleString()} · ${displayed.location ?? "Location not specified"}`}
    >
      {content}
    </Modal>
  );
}
