"use client";

import { useState } from "react";
import type { HillDayResolution as Resolution } from "../../../../shared/capiro/operations/workspace-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

type Meeting = Resolution["meetings"][number];
type Attendee = Meeting["attendees"][number];

function CorrectionDialog({
  id,
  meeting,
  attendee,
  onClose,
  onSaved,
}: {
  id: string;
  meeting: Meeting;
  attendee?: Attendee;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(attendee?.name ?? "");
  const [role, setRole] = useState(attendee?.role ?? "");
  const [location, setLocation] = useState(meeting.office.room ?? "");
  const [memberId, setMemberId] = useState(meeting.office.memberId ?? "");
  const [search, setSearch] = useState("");
  const members = useCapiroQuery(
    "workspace.hillday.members",
    { query: { q: search } },
    { enabled: search.length >= 2 },
  );
  const correction = useCapiroMutation("workspace.hillday.correction");
  async function save() {
    try {
      await correction.run({
        params: { id, meetingId: meeting.meetingId },
        body: attendee
          ? {
              kind: "manual_attendee",
              attendeeId: attendee.attendeeId || undefined,
              name,
              role,
            }
          : { kind: "change_office", memberId },
      });
      onSaved();
      onClose();
    } catch {
      /* Retain draft inputs on failure. */
    }
  }
  async function saveLocation() {
    try {
      await correction.run({
        params: { id, meetingId: meeting.meetingId },
        body: { kind: "edit_meeting_facts", location },
      });
      onSaved();
      onClose();
    } catch {
      /* Retain draft inputs on failure. */
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !correction.pending) onClose();
      }}
      title={attendee ? "Resolve attendee" : "Edit resolved office"}
      footer={
        <>
          <ActionButton disabled={correction.pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={
              correction.pending || (attendee ? !name.trim() : !memberId)
            }
            onClick={save}
          >
            {correction.pending ? "Saving…" : "Confirm"}
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        {attendee ? (
          <>
            <Field label="Full name" htmlFor="hillday-attendee-name">
              <TextInput
                id="hillday-attendee-name"
                value={name}
                maxLength={200}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Title or role" htmlFor="hillday-attendee-role">
              <TextInput
                id="hillday-attendee-role"
                value={role}
                maxLength={200}
                onChange={(event) => setRole(event.target.value)}
              />
            </Field>
            <p className={styles.footnote}>
              Your correction is attributed to your signed-in account.
            </p>
          </>
        ) : (
          <>
            <Field label="Search members" htmlFor="hillday-office-search">
              <TextInput
                id="hillday-office-search"
                value={search}
                placeholder="Search members by name or state…"
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            {members.data?.members.map((member) => (
              <ActionButton
                key={member.memberId}
                onClick={() => setMemberId(member.memberId ?? "")}
              >
                {member.member ?? member.memberName}
                {member.memberId === memberId ? " ✓" : ""}
              </ActionButton>
            ))}
            <Field label="Meeting location" htmlFor="hillday-meeting-location">
              <TextInput
                id="hillday-meeting-location"
                value={location}
                maxLength={240}
                onChange={(event) => setLocation(event.target.value)}
              />
            </Field>
            <ActionButton disabled={correction.pending} onClick={saveLocation}>
              Save location
            </ActionButton>
          </>
        )}
        {correction.error && (
          <p role="alert" className={styles.error}>
            {correction.error.message}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function HillDayResolution({
  id,
  onContinue,
}: {
  id: string;
  onContinue: () => void;
}) {
  const query = useCapiroQuery("workspace.hillday.resolution", {
    params: { id },
  });
  const resolve = useCapiroMutation("workspace.hillday.resolve");
  const correction = useCapiroMutation("workspace.hillday.correction");
  const [selected, setSelected] = useState<{
    meeting: Meeting;
    attendee?: Attendee;
  }>();
  const data = resolve.data ?? query.data;
  const attendees =
    data?.meetings.flatMap((meeting) => meeting.attendees) ?? [];
  const unresolved = attendees.filter(
    (attendee) => attendee.state !== "resolved",
  ).length;
  async function run() {
    try {
      await resolve.run({ params: { id } });
    } catch {
      /* Display the response error. */
    }
  }
  async function accept(
    meeting: Meeting,
    attendee: Attendee,
    useOffice: "directory" | "invite",
  ) {
    try {
      await correction.run({
        params: { id, meetingId: meeting.meetingId },
        body: {
          kind: "accept_stale",
          attendeeId: attendee.attendeeId,
          useOffice,
        },
      });
      resolve.reset();
      query.reload();
    } catch {
      /* Display the response error. */
    }
  }
  return (
    <div className={styles.form}>
      <div className={styles.actions}>
        <ActionButton primary disabled={resolve.pending} onClick={run}>
          {resolve.pending ? "Resolving…" : "Resolve selected meetings"}
        </ActionButton>
        <ActionButton onClick={query.reload}>Refresh resolution</ActionButton>
      </div>
      {(resolve.error || correction.error) && (
        <p role="alert" className={styles.error}>
          {(resolve.error ?? correction.error)?.message}
        </p>
      )}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {data && (
          <>
            <div className={unresolved ? styles.notice : styles.success}>
              <strong>
                {attendees.length - unresolved} of {attendees.length} attendees
                resolved
              </strong>
              <p>
                Partial resolution proceeds. Unresolved attendees stay flagged
                in the packet.
              </p>
            </div>
            {data.meetings.map((meeting) => (
              <article
                className={styles.resolutionCard}
                key={meeting.meetingId}
              >
                <header>
                  <strong>
                    {meeting.office.member ?? "Office to be confirmed"}
                  </strong>
                  <Badge
                    tone={meeting.state === "clean" ? "success" : "warning"}
                  >
                    {meeting.state}
                  </Badge>
                </header>
                <div className={styles.resolutionBody}>
                  <div>
                    <dl className={styles.factList}>
                      <dt>Member</dt>
                      <dd>{meeting.office.member ?? "Not resolved"}</dd>
                      <dt>Party · state</dt>
                      <dd>
                        {meeting.office.party ?? "—"} ·{" "}
                        {meeting.office.state ?? "—"}
                      </dd>
                      <dt>Location</dt>
                      <dd>{meeting.office.room ?? "To be confirmed"}</dd>
                      <dt>Committees</dt>
                      <dd>
                        {meeting.office.committees.join(" · ") || "Unavailable"}
                      </dd>
                      <dt>Derived from</dt>
                      <dd>
                        {meeting.office.derivedFrom?.replaceAll("_", " ") ??
                          "Pending"}
                      </dd>
                    </dl>
                    <div className={styles.actions} style={{ marginTop: 18 }}>
                      <ActionButton onClick={() => setSelected({ meeting })}>
                        Change office / Edit details
                      </ActionButton>
                    </div>
                  </div>
                  <div>
                    {meeting.attendees.map((attendee) => (
                      <article
                        className={`${styles.attendee} ${attendee.state === "resolved" ? "" : styles.warning}`}
                        key={attendee.attendeeId}
                      >
                        <strong>
                          {attendee.name ??
                            attendee.address ??
                            "Unknown attendee"}
                        </strong>
                        <p>
                          {attendee.role ?? "Unknown role"} · {attendee.detail}
                        </p>
                        {attendee.state === "stale" ||
                        attendee.state === "scheduler" ? (
                          <div className={styles.actions}>
                            <ActionButton
                              disabled={correction.pending}
                              onClick={() =>
                                accept(meeting, attendee, "directory")
                              }
                            >
                              Use Directory office
                            </ActionButton>
                            <ActionButton
                              disabled={correction.pending}
                              onClick={() =>
                                accept(meeting, attendee, "invite")
                              }
                            >
                              Use invite office
                            </ActionButton>
                          </div>
                        ) : (
                          <ActionButton
                            onClick={() => setSelected({ meeting, attendee })}
                          >
                            {attendee.state === "resolved"
                              ? "Edit attendee"
                              : "Resolve"}
                          </ActionButton>
                        )}
                      </article>
                    ))}
                    <ActionButton
                      onClick={() =>
                        setSelected({
                          meeting,
                          attendee: {
                            attendeeId: "",
                            name: "",
                            role: "",
                            address: null,
                            state: "unresolved",
                            stafferId: null,
                            detail: "Entered manually",
                            manual: true,
                          },
                        })
                      }
                    >
                      + Add attendee manually
                    </ActionButton>
                  </div>
                </div>
              </article>
            ))}
          </>
        )}
      </StatusPanel>
      <ActionButton
        primary
        disabled={!data?.meetings.length || resolve.pending}
        onClick={onContinue}
      >
        Add context →
      </ActionButton>
      {selected && (
        <CorrectionDialog
          id={id}
          meeting={selected.meeting}
          attendee={selected.attendee}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            resolve.reset();
            query.reload();
          }}
        />
      )}
    </div>
  );
}
