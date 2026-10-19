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
import { PageControls, hearingDate } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";

export function ArchiveScreen() {
  const route = useLegiWatchRoute(),
    [query, setQuery] = useState(""),
    q = useDeferredValue(query),
    [page, setPage] = useState(1);
  const result = useCapiroQuery("legiwatch.archive", {
    query: {
      q: q || undefined,
      temporalScope: "past",
      page,
      pageSize: 25,
      clientId: route.clientId || undefined,
    },
  });
  return (
    <div className={styles.screen}>
      <Field label="Search the hearing archive" htmlFor="archive-query">
        <TextInput
          id="archive-query"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search hearings, testimony, transcripts or findings"
        />
      </Field>
      <StatusPanel
        loading={result.loading}
        error={result.error}
        onRetry={result.reload}
        empty={
          !result.loading && !result.error && !result.data?.rows.length
            ? "No past hearings match your search"
            : undefined
        }
      >
        {result.data && (
          <>
            {result.data.matchMode === "partial" && (
              <p className={styles.banner}>
                These results match some of your search terms.
              </p>
            )}
            <div className={styles.list}>
              {result.data.rows.map((row) => (
                <article className={styles.listItem} key={row.id}>
                  <div className={styles.row}>
                    <strong>{row.title}</strong>
                    <Badge>{row.eventStatus}</Badge>
                  </div>
                  <p className={styles.meta}>
                    {row.calendarDate
                      ? hearingDate(row.calendarDate, row.scheduledStart)
                      : "Date not announced"}{" "}
                    · {row.committeeName}
                  </p>
                  {row.transcriptHit && (
                    <blockquote className={styles.description}>
                      {row.transcriptHit.snippet}
                    </blockquote>
                  )}
                  <div className={styles.actions}>
                    <Badge>
                      {row.transcript.available
                        ? "Transcript available"
                        : "Transcript unavailable"}
                    </Badge>
                    <Badge>{row.intelligenceCount} findings</Badge>
                    <ActionButton
                      onClick={() => route.navigate({ hearingId: row.id })}
                    >
                      Open hearing
                    </ActionButton>
                  </div>
                </article>
              ))}
            </div>
            <PageControls
              page={page}
              total={result.data.total}
              pageSize={25}
              onChange={setPage}
            />
          </>
        )}
      </StatusPanel>
    </div>
  );
}
