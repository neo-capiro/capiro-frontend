"use client";
import { CreateMeeting } from "../../../shared/meetings/CreateMeeting";
import { MeetingDetail } from "../../../shared/meetings/MeetingDetail";
import styles from "./calendar.module.css";
import { CalendarCard } from "./CalendarCard";
import { CalendarHeader } from "./CalendarControls";
import { useCalendar } from "./useCalendar";

export function CalendarScreen() {
  const model = useCalendar();
  const {
    view,
    clients,
    clientId,
    changeScope,
    identity,
    setNewMeeting,
    newMeeting,
    meetings,
    selected,
    setSelected,
  } = model;
  return (
    <div
      className={styles.page}
      data-design-target={
        view === "week"
          ? "411:63168"
          : view === "agenda"
            ? "460:90798"
            : "411:47345"
      }
    >
      <CalendarHeader
        clients={clients.data ?? []}
        disabled={clients.loading || Boolean(clients.error)}
        clientId={clientId}
        onClient={changeScope}
        canCreate={Boolean(
          identity.data && identity.data.role !== "client_portal_user",
        )}
        onCreate={() => setNewMeeting(true)}
      />
      {clients.error && (
        <p role="alert">Client scopes unavailable: {clients.error.message}</p>
      )}
      <CalendarCard model={model} />
      <CreateMeeting
        open={newMeeting}
        onClose={() => setNewMeeting(false)}
        clientId={clientId || undefined}
        onCreated={() => {
          setNewMeeting(false);
          meetings.reload();
        }}
      />
      {selected && (
        <MeetingDetail
          meeting={selected}
          onClose={() => setSelected(undefined)}
          onSaved={meetings.reload}
        />
      )}
    </div>
  );
}
