"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { hearingDate, LegiWatchTabs, SourceLink } from "../components";
import { displayTime } from "../hearings/calendar-dates";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { CommitteeFollowDialog } from "./CommitteeFollowDialog";

export function CommitteeRoom({ id }: { id: string }) {
  const route = useLegiWatchRoute(),
    query = useCapiroQuery("legiwatch.committee", { params: { id } });
  const [tab, setTab] = useState("overview"),
    [follow, setFollow] = useState(false);
  const row = query.data;
  function proceedings() {
    return (
      <div className={styles.list}>
        {[...(row?.upcomingEvents ?? []), ...(row?.recentEvents ?? [])].map(
          (event) => (
            <article className={styles.listItem} key={event.id}>
              <Badge>{event.eventStatus}</Badge>
              <strong>{event.title}</strong>
              <p className={styles.description}>
                {hearingDate(event.date, event.startsAt)} ·{" "}
                {displayTime(event.startsAt, event.time)} · {event.visibility}
              </p>
              <ActionButton
                onClick={() => route.navigate({ hearingId: event.id })}
              >
                Open hearing
              </ActionButton>
            </article>
          ),
        )}
        {row && row.upcomingEvents.length + row.recentEvents.length === 0 && (
          <p className={styles.description}>
            No proceedings were returned within the committee room&apos;s one
            year windows.
          </p>
        )}
      </div>
    );
  }
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {row && (
        <>
          <h2 className={styles.roomTitle}>{row.name}</h2>
          <div className={styles.actions}>
            <ActionButton onClick={() => route.navigate({ committeeId: null })}>
              Committee directory
            </ActionButton>
            <ActionButton primary onClick={() => setFollow(true)}>
              {row.following ? "Edit committee follow" : "Follow committee"}
            </ActionButton>
            <SourceLink href={row.officialUrl}>Official site</SourceLink>
          </div>
          <LegiWatchTabs
            value={tab}
            items={[
              { id: "overview", label: "Overview" },
              { id: "proceedings", label: "Proceedings" },
              { id: "members", label: "Members" },
              { id: "updates", label: "Updates" },
            ]}
            onChange={setTab}
            label="Committee room"
          />
          {tab === "overview" && (
            <>
              <div className={styles.room}>
                <section className={styles.card}>
                  <h2>Jurisdiction and leadership</h2>
                  <p>
                    {row.jurisdiction ??
                      "Jurisdiction text has not been supplied by the official source."}
                  </p>
                  <p className={styles.description}>
                    Chair · {row.chair?.name ?? "Official roster not available"}
                    <br />
                    Ranking member ·{" "}
                    {row.rankingMember?.name ?? "Official roster not available"}
                  </p>
                  <ActionButton onClick={() => setTab("members")}>
                    View members
                  </ActionButton>
                </section>
                <section className={styles.card}>
                  <Badge>{row.sourceHealth}</Badge>
                  <p>
                    Last successful source check
                    <br />
                    {row.lastSourceSuccessAt
                      ? new Date(row.lastSourceSuccessAt).toLocaleString()
                      : "No successful check recorded"}
                  </p>
                  <SourceLink href={row.sourceUrl}>
                    View monitored source
                  </SourceLink>
                </section>
              </div>
              <section className={styles.card}>
                <h2>Subcommittees</h2>
                <div className={styles.actions}>
                  {row.subcommittees.map((body) => (
                    <ActionButton
                      key={body.systemCode}
                      onClick={() =>
                        route.navigate({ committeeId: body.systemCode })
                      }
                    >
                      {body.name}
                    </ActionButton>
                  ))}
                </div>
                {!row.subcommittees.length && (
                  <p className={styles.description}>
                    No subcommittees in the current catalog.
                  </p>
                )}
              </section>
              {proceedings()}
            </>
          )}
          {tab === "proceedings" && proceedings()}
          {tab === "members" && (
            <DataTable
              rows={row.members}
              rowKey={(member) => member.id}
              caption="Official committee roster"
              columns={[
                {
                  key: "name",
                  label: "Member",
                  render: (member) => member.name,
                },
                {
                  key: "role",
                  label: "Role",
                  render: (member) => member.role ?? "—",
                },
                {
                  key: "party",
                  label: "Party",
                  render: (member) => member.party ?? "—",
                },
                { key: "side", label: "Side", render: (member) => member.side },
              ]}
            />
          )}
          {tab === "updates" && (
            <div className={styles.list}>
              {row.updates.map((update) => (
                <article className={styles.listItem} key={update.id}>
                  <Badge>{update.updateType}</Badge>
                  <strong>{update.title ?? "Official source update"}</strong>
                  <p>{update.summary}</p>
                  <p className={styles.description}>
                    Observed {new Date(update.lastSeenAt).toLocaleString()}
                    {update.publishedAt &&
                      ` · Published ${new Date(update.publishedAt).toLocaleString()}`}
                  </p>
                  <SourceLink href={update.sourceUrl}>
                    View exact source
                  </SourceLink>
                </article>
              ))}
              {!row.updates.length && (
                <p className={styles.description}>
                  No source updates returned.
                </p>
              )}
            </div>
          )}
          <CommitteeFollowDialog
            id={id}
            open={follow}
            onClose={() => setFollow(false)}
            onSaved={query.reload}
          />
        </>
      )}
    </StatusPanel>
  );
}
