"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  StatusPanel,
  Tabs,
} from "../../../../shared/module-ui";
import {
  hearingDate,
  displayTime,
  SourceLink,
} from "../../intelligence/legiwatch/public";
import { DirectoryPagination } from "../DirectoryPagination";
import styles from "./committees.module.css";
import { useCommitteeRoute } from "./committee-route";
import { CommitteeFollowDialog } from "./CommitteeFollowDialog";

export function StateCommitteeRoom({ id }: { id: string }) {
  const route = useCommitteeRoute(),
    [tab, setTab] = useState("overview"),
    [page, setPage] = useState(1),
    [follow, setFollow] = useState(false);
  const query = useCapiroQuery("legiwatch.stateCommittee", {
      params: { id },
      query: { referralPage: page },
    }),
    row = query.data;
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {row && (
        <section className={styles.screen} aria-label="Committee details">
          <h2 className={styles.roomTitle}>{row.body.name}</h2>
          <p className={styles.description}>
            Florida · {row.body.chamber} ·{" "}
            {row.body.legislativeSession ?? "Session not supplied"}
          </p>
          <div className={styles.actions}>
            <ActionButton onClick={() => route.openDirectory()}>
              Committee directory
            </ActionButton>
            <ActionButton primary onClick={() => setFollow(true)}>
              Follow committee
            </ActionButton>
            <SourceLink href={row.body.sourceUrl}>Official site</SourceLink>
          </div>
          <Tabs
            value={tab}
            items={[
              { id: "overview", label: "Overview" },
              { id: "proceedings", label: "Proceedings" },
              { id: "members", label: "Members" },
              { id: "bills", label: "Referred bills" },
              { id: "updates", label: "Updates" },
            ]}
            onChange={setTab}
            label="Florida committee room"
          />
          {tab === "overview" && (
            <div className={styles.room}>
              <section className={styles.card}>
                <h2>Committee identity and roster</h2>
                <p>
                  Official identity ·{" "}
                  {row.body.officialSourceKey ?? "Not supplied"}
                </p>
                <p>
                  {row.rosterStatus === "unqualified"
                    ? "The official identity is verified; a qualified roster has not been supplied."
                    : `${row.members.length} members with source memberships`}
                </p>
                <ActionButton onClick={() => setTab("members")}>
                  View members
                </ActionButton>
              </section>
              <section className={styles.card}>
                <h2>Source coverage</h2>
                {row.sourceCoverage.map((source, index) => (
                  <div key={`${source.chamber}-${index}`}>
                    <Badge>{source.status}</Badge>
                    <p>
                      {source.chamber} · {source.from} through {source.to}
                      <br />
                      {source.items} records · {source.sourceHealth}
                    </p>
                    {source.lastError && (
                      <p className={styles.error}>{source.lastError}</p>
                    )}
                    <SourceLink href={source.sourceUrl}>
                      Official coverage source
                    </SourceLink>
                  </div>
                ))}
                {!row.sourceCoverage.length && (
                  <p>No qualified coverage returned.</p>
                )}
              </section>
            </div>
          )}
          {tab === "proceedings" && (
            <div className={styles.list}>
              {[...row.upcomingEvents.rows, ...row.recentEvents.rows].map(
                (event) => (
                  <article className={styles.listItem} key={event.id}>
                    <Badge>{event.eventStatus}</Badge>
                    <strong>{event.title}</strong>
                    <p className={styles.description}>
                      {hearingDate(event.date, event.startsAt)} ·{" "}
                      {displayTime(event.startsAt, event.time)}
                    </p>
                    <ActionButton onClick={() => route.openHearing(event.id)}>
                      Open hearing
                    </ActionButton>
                  </article>
                ),
              )}
              <p className={styles.description}>
                {row.upcomingEvents.total} upcoming · {row.recentEvents.total}{" "}
                recent proceedings. Room windows show up to 200 records each.
              </p>
            </div>
          )}
          {tab === "members" && (
            <DataTable
              rows={row.members}
              rowKey={(member) => member.id}
              caption="Source committee memberships"
              columns={[
                {
                  key: "name",
                  label: "Member",
                  render: (member) => (
                    <SourceLink href={member.url}>{member.name}</SourceLink>
                  ),
                },
                {
                  key: "role",
                  label: "Roles",
                  render: (member) => member.roles.join(" · ") || "—",
                },
                {
                  key: "party",
                  label: "Party",
                  render: (member) => member.party ?? "—",
                },
                {
                  key: "district",
                  label: "District",
                  render: (member) => member.district ?? "—",
                },
              ]}
            />
          )}
          {tab === "bills" && (
            <>
              <DataTable
                rows={row.referredBills.rows}
                rowKey={(bill) => bill.id}
                caption="Bills referred to this exact committee identity"
                columns={[
                  {
                    key: "number",
                    label: "Bill",
                    render: (bill) => bill.billNumber,
                  },
                  {
                    key: "title",
                    label: "Title",
                    render: (bill) => bill.title ?? "—",
                  },
                  {
                    key: "date",
                    label: "Latest action",
                    render: (bill) => bill.latestActionDate ?? "—",
                  },
                ]}
              />
              <DirectoryPagination
                page={row.referredBills.page}
                pageSize={row.referredBills.pageSize}
                total={row.referredBills.total}
                onPage={setPage}
              />
            </>
          )}
          {tab === "updates" && (
            <div className={styles.list}>
              {row.updates.rows.map((update) => (
                <article key={update.id} className={styles.listItem}>
                  <Badge>{update.updateType}</Badge>
                  <strong>{update.title ?? "Official source update"}</strong>
                  <p>{update.summary}</p>
                  <SourceLink href={update.sourceUrl}>Exact source</SourceLink>
                </article>
              ))}
              {row.updates.truncated && (
                <p className={styles.description}>
                  Showing {row.updates.returned} of {row.updates.total} source
                  updates.
                </p>
              )}
            </div>
          )}
          <CommitteeFollowDialog
            id={`state:FL:${row.body.id}`}
            open={follow}
            onClose={() => setFollow(false)}
            onSaved={query.reload}
          />
        </section>
      )}
    </StatusPanel>
  );
}
