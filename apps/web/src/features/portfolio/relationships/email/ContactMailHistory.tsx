"use client";
import type { MailThread, useContactThreads } from "../email";
import type { MailFilters } from "./read-contracts";
import { SelectField } from "@/shared/portfolio/ui/SelectField";

export function MailHistoryFilters({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (filters: MailFilters) => void;
}) {
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        const values = new FormData(event.currentTarget);
        onApply({
          query: String(values.get("query") ?? "").trim(),
          folder: values.get("folder") as MailFilters["folder"],
          withinDays: values.get("days")
            ? Number(values.get("days"))
            : undefined,
        });
      }}
    >
      <label>
        Search stored mail
        <input name="query" type="search" maxLength={200} disabled={disabled} />
      </label>
      <div className="row">
        <SelectField
          label="Folder"
          name="folder"
          defaultValue="all"
          disabled={disabled}
        >
          <option value="all">All stored mail</option>
          <option value="inbox">Inbox</option>
          <option value="sent">Sent</option>
        </SelectField>
        <SelectField
          label="Message date"
          name="days"
          defaultValue=""
          disabled={disabled}
        >
          <option value="">All stored dates</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </SelectField>
        <button className="button" disabled={disabled} type="submit">
          Apply filters
        </button>
      </div>
    </form>
  );
}

export function ContactHistory({
  history,
  query,
  refresh,
  select,
}: {
  history: MailThread[] | undefined;
  query: ReturnType<typeof useContactThreads>;
  refresh: () => void;
  select: (id: string) => void;
}) {
  return (
    <>
      {history?.map((item) => (
        <button
          className="button ghost"
          key={item.id}
          disabled={query.isFetching}
          onClick={() => {
            if (history && !query.isFetching) select(item.id);
          }}
        >
          <span>
            <strong>{item.subject}</strong>
            <p className="muted">{item.snippet}</p>
            <p className="muted">
              <small>
                <ContactMessageDate messages={item.messages} />
              </small>
            </p>
          </span>
        </button>
      ))}
      {history?.length === 0 && (
        <p className="muted">
          No accessible stored messages match this contact and these filters.
        </p>
      )}
      {history && (
        <>
          <div className="row">
            {query.hasNextPage && (
              <button
                className="button"
                disabled={query.isFetching}
                onClick={() => void query.fetchNextPage()}
              >
                {query.isFetchingNextPage
                  ? "Loading more threads…"
                  : "Load more threads"}
              </button>
            )}
            <button
              className="button ghost"
              disabled={query.isFetching}
              onClick={refresh}
            >
              Refresh history
            </button>
          </div>
          <small className="muted">
            {query.hasNextPage
              ? "More stored threads are available."
              : "End of matching stored threads."}{" "}
            New sync can change their order. Refresh to see the latest stored
            mail.
          </small>
          <MailCoverage page={query.page} />
        </>
      )}
    </>
  );
}

function ContactMessageDate({
  messages,
}: {
  messages: MailThread["messages"];
}) {
  let latest: { value: string; instant: number } | undefined;
  for (const message of messages) {
    const value = message.sentAt ?? message.receivedAt ?? message.createdAt;
    const instant = Date.parse(value);
    if (Number.isFinite(instant) && (!latest || instant > latest.instant))
      latest = { value, instant };
  }
  if (!latest) return "Date unavailable";
  const date = new Date(latest.instant);
  return (
    <time dateTime={latest.value} title="Latest available message date">
      {date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
      {" · "}
      {date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}
    </time>
  );
}

function MailCoverage({
  page,
}: {
  page: ReturnType<typeof useContactThreads>["page"];
}) {
  return (
    <>
      {page?.mailboxes.length === 0 && (
        <p className="muted">No mail account is available for this read.</p>
      )}
      {page?.mailboxes.map((box) => (
        <small className="muted" key={box.id}>
          {box.email ?? "Mail account"}:{" "}
          {box.coverage.sourceStatus === "unavailable"
            ? "Mailbox unavailable."
            : box.coverage.sourceStatus === "healthy"
              ? "Stored sync is current."
              : "Stored sync is incomplete or delayed."}{" "}
          {box.coverage.lastMailSyncAt
            ? `Last mail sync ${new Date(box.coverage.lastMailSyncAt).toLocaleString()}.`
            : "Mail has not completed a sync."}{" "}
          Provider history may be incomplete.
        </small>
      ))}
      {page?.coverageTruncated && (
        <small className="muted">
          Coverage is shown for the first 50 mail accounts.
        </small>
      )}
    </>
  );
}
