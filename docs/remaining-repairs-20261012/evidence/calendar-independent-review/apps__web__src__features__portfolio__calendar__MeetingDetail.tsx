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
import { MeetingAttendance } from "./attendance/public";
import { MeetingAttachmentApprovals } from "./review/public";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import type { CalendarZone } from "./range";
import type { Meeting } from "./contracts";
import { initialMeetingTab, type MeetingTab } from "./lifecycle";
import { MeetingIdentity } from "./MeetingIdentity";
import { MeetingSharing } from "./sharing/MeetingSharing";
import styles from "./calendar.module.css";

export function MeetingDetail({
  id,
  onClose,
  zone,
  clientId,
}: {
  id: string | null;
  onClose: () => void;
  zone: CalendarZone;
  destinations: Destinations;
  clientId?: string;
}) {
  const query = useMeeting(id);
  const identity = useIdentity();
  const meeting = query.data;
  const inScope = !clientId || meeting?.client?.id === clientId;
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
      <QueryState
        pending={query.isPending || identity.isPending}
        error={query.error ?? identity.error}
        retry={() =>
          void (identity.error ? identity.refetch() : query.refetch())
        }
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
          zone={zone}
          clientId={clientId}
          onClose={onClose}
          current={
            query.isSuccess &&
            !query.isFetching &&
            !query.error &&
            identity.isSuccess &&
            !identity.isFetching &&
            !identity.error
          }
        />
      )}
    </Dialog>
  );
}

/** One mounted meeting owns the initial entry tab; refreshes do not change a chosen tab. */
function MeetingWorkspace({
  meeting,
  zone,
  clientId,
  onClose,
  current,
}: {
  meeting: Meeting;
  zone: CalendarZone;
  clientId?: string;
  onClose: () => void;
  current: boolean;
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
      <div hidden={!current}>
        <MeetingIdentity
          meeting={meeting}
          zone={zone}
          onEdit={() => setEditing(true)}
          onAssign={() => setAssigning(true)}
          onShare={() => setSharing(true)}
        />
        <nav className="row" aria-label="Meeting sections">
          {(["information", "preparation", "notes", "debriefs"] as const).map(
            (value) => (
              <button
                className={`button ${tab === value ? "primary" : ""}`}
                key={value}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {value[0]?.toUpperCase()}
                {value.slice(1)}
              </button>
            ),
          )}
        </nav>
        {tab === "information" && (
          <div className="stack">
            <MeetingAttendance meeting={meeting} zone={zone} />
            <p>{meeting.description ?? "No description."}</p>
          </div>
        )}
        {tab === "preparation" && (
          <>
            <MeetingPreparation meeting={meeting} />
            <MeetingAttachmentApprovals meeting={meeting} />
          </>
        )}
        {(tab === "notes" || tab === "debriefs") && (
          <MeetingArtifacts key={tab} meeting={meeting} kind={tab} />
        )}
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
