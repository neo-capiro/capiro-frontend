"use client";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { sharedFeedSchema } from "../sharing/contracts";
import type { CalendarZone } from "../range";
import { formatInstant } from "../range";
import styles from "./library.module.css";

/** This client feed is metadata, not permission to read a colleague's private detail. */
export function SharedMeetings({
  clientId,
  zone,
  onClose,
}: {
  clientId: string;
  zone: CalendarZone;
  onClose: () => void;
}) {
  const identity = useIdentity();
  const api = useApi();
  const tenantId = identity.data?.tenant?.id;
  const allowed =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    Boolean(tenantId && identity.data.user.id) &&
    (identity.data.role === "standard_user" ||
      canAdminister(identity.data.role));
  const query = useQuery({
    queryKey: [
      "calendar",
      "shared-meetings",
      tenantId ?? null,
      identity.data?.user.id ?? null,
      clientId,
    ],
    enabled: allowed,
    staleTime: 0,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `engagement/shared-meetings?clientId=${encodeURIComponent(clientId)}`,
        sharedFeedSchema(clientId, tenantId ?? ""),
        { signal },
      ),
  });
  const current =
    allowed && query.isSuccess && !query.isFetching && !query.error;
  return (
    <section
      className={`page ${styles.library}`}
      aria-label="Client shared meetings"
    >
      <header className="pageHeader">
        <h1>Shared meetings</h1>
        <button className="button" onClick={onClose}>
          ← Calendar
        </button>
      </header>
      <p className="muted">
        Meeting artifacts shared with this client in your organization. This
        feed is separate from your approved meeting library.
      </p>
      <div className="row between">
        <small>Client scope · {clientId}</small>
        <button
          className="button"
          disabled={!allowed || query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh shared meetings
        </button>
      </div>
      <QueryState
        pending={
          identity.isPending ||
          identity.isFetching ||
          (allowed && (query.isPending || query.isFetching))
        }
        error={identity.error ?? query.error}
        retry={() =>
          void (identity.error ? identity.refetch() : query.refetch())
        }
      />
      {!allowed &&
        identity.isSuccess &&
        !identity.isFetching &&
        !identity.error && (
          <p role="alert">Shared meetings are unavailable for this role.</p>
        )}
      {current &&
        (query.data.length ? (
          query.data.map((meeting) => (
            <article
              className="card stack"
              key={meeting.id}
              aria-label={meeting.subject}
            >
              <header>
                <h2>{meeting.subject}</h2>
                <p>
                  {meeting.client?.name} ·{" "}
                  {Number.isFinite(Date.parse(meeting.startsAt))
                    ? formatInstant(meeting.startsAt, zone)
                    : "Meeting time unavailable"}
                </p>
              </header>
              <p>
                {meeting.preps.length} prep · {meeting.notes.length} notes ·{" "}
                {meeting.debriefs.length} debriefs ·{" "}
                {meeting.attachments.length} attachments
              </p>
              {meeting.preps.map((prep) => (
                <details key={prep.id}>
                  <summary>Shared meeting prep · {prep.status}</summary>
                  <p>{prep.summary ?? "No summary provided."}</p>
                </details>
              ))}
              {(meeting.notes.length > 0 || meeting.debriefs.length > 0) && (
                <p className="muted">
                  Notes and debriefs are listed as shared metadata. Their text
                  is not provided by this feed.
                </p>
              )}
              {meeting.attachments.length > 0 && (
                <>
                  <ul>
                    {meeting.attachments.map((file) => (
                      <li key={file.id}>{file.fileName}</li>
                    ))}
                  </ul>
                  <p className="muted">
                    File download and readiness are not provided by this feed.
                  </p>
                </>
              )}
            </article>
          ))
        ) : (
          <p className="empty">No meetings are shared with this client.</p>
        ))}
    </section>
  );
}
