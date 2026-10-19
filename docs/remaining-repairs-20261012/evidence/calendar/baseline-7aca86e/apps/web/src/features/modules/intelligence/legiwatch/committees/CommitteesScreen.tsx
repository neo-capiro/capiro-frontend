"use client";
import { useDeferredValue, useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { LegiWatchTabs, SourceLink } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { CommitteeRoom } from "./CommitteeRoom";
import { StateCommitteeRoom } from "./StateCommitteeRoom";

export function CommitteesScreen() {
  const route = useLegiWatchRoute();
  const [jurisdiction, setJurisdiction] = useState("US");
  const [search, setSearch] = useState("");
  const term = useDeferredValue(search).toLowerCase();
  const federal = useCapiroQuery(
    "legiwatch.committees",
    {},
    { enabled: jurisdiction === "US" && !route.committeeId },
  );
  const florida = useCapiroQuery(
    "legiwatch.stateCommittees",
    {},
    { enabled: jurisdiction === "FL" && !route.committeeId },
  );
  if (route.committeeId)
    return route.committeeId.startsWith("state:FL:") ? (
      <StateCommitteeRoom id={route.committeeId.slice("state:FL:".length)} />
    ) : (
      <CommitteeRoom id={route.committeeId} />
    );
  const query = jurisdiction === "US" ? federal : florida;
  return (
    <>
      <LegiWatchTabs
        value={jurisdiction}
        items={[
          { id: "US", label: "Federal" },
          { id: "FL", label: "Florida" },
        ]}
        onChange={setJurisdiction}
        label="Committee jurisdiction"
      />
      <Field label="Search committees" htmlFor="lw-committee-search">
        <TextInput
          id="lw-committee-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the complete committee directory"
        />
      </Field>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
        empty={
          (
            jurisdiction === "US"
              ? federal.data?.rows.length === 0
              : florida.data?.length === 0
          )
            ? "No committees were returned."
            : undefined
        }
      >
        <div className={styles.list}>
          {jurisdiction === "US"
            ? federal.data?.rows
                .filter((row) =>
                  `${row.name} ${row.systemCode}`.toLowerCase().includes(term),
                )
                .map((row) => (
                  <article key={row.systemCode} className={styles.listItem}>
                    <div className={styles.row}>
                      <div>
                        <strong>{row.name}</strong>
                        <p className={styles.description}>
                          {row.chamber} ·{" "}
                          {row.isSubcommittee
                            ? "Subcommittee"
                            : "Full committee"}{" "}
                          · {row.systemCode}
                        </p>
                      </div>
                      <ActionButton
                        onClick={() =>
                          route.navigate({ committeeId: row.systemCode })
                        }
                      >
                        Open committee
                      </ActionButton>
                    </div>
                    <div className={styles.meta}>
                      <Badge>{row.sourceHealth}</Badge>
                      <span>{row.upcomingEventCount} upcoming proceedings</span>
                      <span>{row.recentEventCount} recent proceedings</span>
                      {row.following && <Badge tone="success">Following</Badge>}
                    </div>
                  </article>
                ))
            : florida.data
                ?.filter((row) => row.name.toLowerCase().includes(term))
                .map((row) => (
                  <article key={row.id} className={styles.listItem}>
                    <div className={styles.row}>
                      <div>
                        <strong>{row.name}</strong>
                        <p className={styles.description}>
                          Florida · {row.chamber} ·{" "}
                          {row.legislativeSession ?? "Session not supplied"}
                        </p>
                      </div>
                      <ActionButton
                        onClick={() =>
                          route.navigate({ committeeId: `state:FL:${row.id}` })
                        }
                      >
                        Open committee
                      </ActionButton>
                    </div>
                    <SourceLink href={row.sourceUrl}>
                      Official committee page
                    </SourceLink>
                  </article>
                ))}
        </div>
      </StatusPanel>
      {jurisdiction === "US" && federal.data && (
        <p className={styles.description}>
          {federal.data.parentCount} committees ·{" "}
          {federal.data.subcommitteeCount} subcommittees · Updated{" "}
          {new Date(federal.data.asOf).toLocaleString()}
        </p>
      )}
    </>
  );
}
