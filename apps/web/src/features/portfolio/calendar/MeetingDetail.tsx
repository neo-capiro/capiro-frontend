"use client";
import { useState } from "react";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useMeeting } from "./queries";
import { MeetingArtifacts } from "./MeetingArtifacts";
import { MeetingForm } from "./MeetingForm";
import { MeetingPreparation } from "./preparation/public";
import { MeetingAssignment } from "./library/public";
import { MeetingAttachmentApprovals } from "./review/public";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import type { CalendarZone } from "./range";
import type { Meeting } from "./contracts";
import { initialMeetingTab, type MeetingTab } from "./lifecycle";
import { MeetingIdentity } from "./MeetingIdentity";
import { MeetingSharing } from "./sharing/MeetingSharing";
import styles from "./calendar.module.css";
import workspaceStyles from "./meeting-workspace.module.css";

export function MeetingDetail({
  id,
  onClose,
  zone,
  clientId,
  inline = false,
}: {
  id: string | null;
  onClose: () => void;
  zone: CalendarZone;
  destinations: Destinations;
  clientId?: string;
  inline?: boolean;
}) {
  const query = useMeeting(id, clientId);
  const identity = useIdentity();
  const meeting = query.data?.meeting;
  const unusablePreps = query.data?.unusablePreps ?? 0;
  const inScope = !clientId || meeting?.client?.id === clientId;
  const refresh = () =>
    void (identity.error ? identity.refetch() : query.refetch());
  const content = (
    <>
      <QueryState
        pending={query.isPending || identity.isPending}
        error={query.error ?? identity.error}
        retry={refresh}
      />
      {meeting && !inScope && (
        <p role="alert">
          This meeting is not associated with the selected client.
        </p>
      )}
      {meeting && inScope && (
        <MeetingWorkspace
          key={`${meeting.id}:${identity.data?.tenant?.id}:${identity.data?.user.id}:${meeting.client?.id}`}
          meeting={meeting}
          unusablePreps={unusablePreps}
          zone={zone}
          clientId={clientId}
          onClose={onClose}
          onRefresh={refresh}
          current={
            // A background refetch (the 5 s prep-job poll, a save, a tab return)
            // keeps the last good answer on screen. Only a failed or unknown
            // caller state makes the details unavailable (H1).
            query.isSuccess &&
            !query.error &&
            identity.isSuccess &&
            !identity.error
          }
          inline={inline}
        />
      )}
    </>
  );
  if (inline) {
    return (
      <section
        className={workspaceStyles.workspacePanel}
        role="dialog"
        aria-label={
          inScope ? (meeting?.subject ?? "Meeting") : "Meeting unavailable"
        }
        onKeyDown={(event) => {
          if (
            event.key === "Escape" &&
            !event.defaultPrevented &&
            event.target instanceof Element &&
            event.target.closest('[role="dialog"]') === event.currentTarget
          )
            onClose();
        }}
      >
        {content}
      </section>
    );
  }
  return (
    <Dialog
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={inScope ? (meeting?.subject ?? "Meeting") : "Meeting unavailable"}
      drawer
      className={styles.meetingDrawer}
    >
      {content}
    </Dialog>
  );
}

/** One mounted meeting owns the initial entry tab; refreshes do not change a chosen tab. */
function MeetingWorkspace({
  meeting,
  unusablePreps,
  zone,
  clientId,
  onClose,
  current,
  inline,
  onRefresh,
}: {
  meeting: Meeting;
  unusablePreps: number;
  zone: CalendarZone;
  clientId?: string;
  onClose: () => void;
  current: boolean;
  inline: boolean;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<MeetingTab>(() =>
    initialMeetingTab(meeting, Date.now()),
  );
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [sharing, setSharing] = useState(false);
  return (
    <>
      {!current && (
        <p role="status">
          Current meeting details are unavailable while access or saved data is
          being checked. Open local drafts are retained.
        </p>
      )}
      <div
        hidden={!current}
        className={inline ? workspaceStyles.workspaceContent : undefined}
      >
        <MeetingIdentity
          meeting={meeting}
          zone={zone}
          onEdit={() => setEditing(true)}
          onAssign={() => setAssigning(true)}
          onShare={() => setSharing(true)}
          onClose={onClose}
          inline={inline}
        />
        <nav
          className={inline ? workspaceStyles.workspaceTabs : "row"}
          aria-label="Meeting sections"
        >
          {(["information", "preparation", "notes", "debriefs"] as const).map(
            (value) => (
              <button
                className={
                  inline
                    ? workspaceStyles.workspaceTab
                    : `button ${tab === value ? "primary" : ""}`
                }
                key={value}
                aria-pressed={tab === value}
                aria-label={
                  inline
                    ? (
                        {
                          information: "Information",
                          preparation: "Preparation",
                          notes: "Notes",
                          debriefs: "Debriefs",
                        } as const
                      )[value]
                    : undefined
                }
                onClick={() => setTab(value)}
              >
                {inline
                  ? (
                      {
                        information: "Info",
                        preparation: "Prep",
                        notes: "Meeting Notes",
                        debriefs: "Debrief",
                      } as const
                    )[value]
                  : `${value[0]?.toUpperCase()}${value.slice(1)}`}
              </button>
            ),
          )}
        </nav>
        <div
          className={inline ? workspaceStyles.workspaceTabContent : undefined}
        >
          {tab === "information" && (
            <div className="stack">
              <p>{meeting.description ?? "No description."}</p>
            </div>
          )}
          {tab === "preparation" && (
            <>
              <MeetingPreparation
                meeting={meeting}
                unusablePreps={unusablePreps}
              />
              <MeetingAttachmentApprovals meeting={meeting} />
            </>
          )}
          {(tab === "notes" || tab === "debriefs") && (
            <MeetingArtifacts key={tab} meeting={meeting} kind={tab} />
          )}
        </div>
      </div>
      {sharing && (
        <MeetingSharing meeting={meeting} onClose={() => setSharing(false)} />
      )}
      <MeetingForm
        key={editing ? "editing" : "closed"}
        meeting={meeting}
        open={editing}
        onOpenChange={setEditing}
        zone={zone}
        clientId={clientId}
        current={current}
        onRefresh={onRefresh}
      />
      <MeetingAssignment
        meeting={meeting}
        open={assigning}
        onOpenChange={setAssigning}
        onAssigned={(saved) => {
          if (clientId && saved.client?.id !== clientId) onClose();
        }}
      />
    </>
  );
}
