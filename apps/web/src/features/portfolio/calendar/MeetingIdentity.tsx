"use client";
import { MapPin, Video } from "lucide-react";
import { safeWebsite } from "@/shared/portfolio/domain/website";
import type { Meeting } from "./contracts";
import { formatInstant, type CalendarZone } from "./range";
import { meetingMaterials, meetingStage } from "./lifecycle";
import styles from "./calendar.module.css";
import workspaceStyles from "./meeting-workspace.module.css";
import { useMeetingClock } from "./useMeetingClock";
import { MeetingAttendance } from "./attendance/public";

export function MeetingIdentity({
  meeting,
  zone,
  onEdit,
  onAssign,
  onShare,
  onClose,
  inline = false,
}: {
  meeting: Meeting;
  zone: CalendarZone;
  onEdit: () => void;
  onAssign: () => void;
  onShare: () => void;
  onClose?: () => void;
  inline?: boolean;
}) {
  const now = useMeetingClock();
  const stage = meetingStage(meeting, now);
  const validTime =
    Number.isFinite(Date.parse(meeting.startsAt)) &&
    Number.isFinite(Date.parse(meeting.endsAt));
  if (inline) {
    const materials = meetingMaterials(meeting);
    const start = validTime ? new Date(meeting.startsAt) : null;
    const end = validTime ? new Date(meeting.endsAt) : null;
    const day = start?.toLocaleString("en-US", {
      timeZone: zone,
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const startTime = start?.toLocaleString("en-US", {
      timeZone: zone,
      hour: "numeric",
      minute: "2-digit",
    });
    const endTime = end?.toLocaleString("en-US", {
      timeZone: zone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const attendeeNames = meeting.attendees.map(
      (attendee) => attendee.name ?? attendee.email ?? "Unnamed attendee",
    );
    return (
      <header className={workspaceStyles.workspaceIdentity}>
        <div className={workspaceStyles.workspaceIdentityTop}>
          <small>
            {meeting.id} · {meeting.client?.name ?? "No client"}
          </small>
          <small>
            {stage === "unknown"
              ? "Lifecycle unavailable"
              : `${stage[0]?.toUpperCase()}${stage.slice(1)}`}
            {stage === "completed" && materials.debrief !== "Approved"
              ? " · Needs debrief"
              : ""}
          </small>
        </div>
        <h2>{meeting.subject}</h2>
        <strong>
          {validTime
            ? `${day} · ${startTime}–${endTime}`
            : "Meeting time unavailable"}
          {meeting.location
            ? ` · ${meeting.location}`
            : meeting.isVirtual
              ? " · Virtual meeting"
              : ""}
        </strong>
        <p>
          Attendees · {meeting.attendees.length}
          {attendeeNames.length ? ` · ${attendeeNames.join(", ")}` : ""}
        </p>
        <div className={workspaceStyles.workspaceIdentityActions}>
          {safeWebsite(meeting.joinLink) && (
            <a
              className="button"
              href={safeWebsite(meeting.joinLink)}
              target="_blank"
              rel="noreferrer"
            >
              <Video size={16} />
              Join
            </a>
          )}
          <MeetingAttendance meeting={meeting} zone={zone} compact />
          <button className="button" onClick={onShare}>
            Share artifacts
          </button>
          <button className="button ghost" onClick={onClose}>
            Close ×
          </button>
          <details>
            <summary>More actions</summary>
            <div>
              <button className="button" onClick={onEdit}>
                Edit meeting
              </button>
              <button className="button" onClick={onAssign}>
                Client assignment
              </button>
            </div>
          </details>
        </div>
      </header>
    );
  }
  return (
    <section className={styles.meetingIdentity} aria-label="Meeting identity">
      <div className="row between">
        <small>
          Meeting {meeting.id} · {meeting.client?.name ?? "No client"}
        </small>
        <span className="chip">
          {stage === "unknown"
            ? "Lifecycle unavailable"
            : stage[0]?.toUpperCase() + stage.slice(1)}
        </span>
      </div>
      <div className="row">
        <span className="chip">{meeting.visibility}</span>
        {meeting.meri && <small>Meri {meeting.meri}</small>}
      </div>
      <p>
        {validTime
          ? `${formatInstant(meeting.startsAt, zone)} – ${formatInstant(meeting.endsAt, zone)}`
          : "Meeting time unavailable"}{" "}
        · {meeting.isVirtual ? "Virtual meeting" : "In person"}
      </p>
      {meeting.location && (
        <p className="row">
          <MapPin size={16} />
          {meeting.location}
        </p>
      )}
      <details>
        <summary>
          Attendees · {meeting.attendees.length}
          {meeting.attendees.length > 0 &&
            ` · ${meeting.attendees.map((attendee) => attendee.name ?? attendee.email ?? "Unnamed attendee").join(", ")}`}
        </summary>
        {meeting.attendees.length ? (
          <ul>
            {meeting.attendees.map((attendee) => (
              <li key={attendee.id}>
                {attendee.name ?? attendee.email ?? "Unnamed attendee"}
                {attendee.role && ` · ${attendee.role}`}
              </li>
            ))}
          </ul>
        ) : (
          <p>No attendees listed.</p>
        )}
      </details>
      <div className="row">
        {safeWebsite(meeting.joinLink) && (
          <a
            className="button"
            href={safeWebsite(meeting.joinLink)}
            target="_blank"
            rel="noreferrer"
          >
            <Video size={16} />
            Join meeting
          </a>
        )}
        <button className="button" onClick={onEdit}>
          Edit meeting
        </button>
        <MeetingAttendance meeting={meeting} zone={zone} compact />
        <button className="button" onClick={onShare}>
          Share artifacts
        </button>
        <button className="button" onClick={onAssign}>
          Client assignment
        </button>
      </div>
    </section>
  );
}
