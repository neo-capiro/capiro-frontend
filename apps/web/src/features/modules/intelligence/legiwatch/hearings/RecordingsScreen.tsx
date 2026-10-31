"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { LegiWatchTabs, PageControls, hearingDate } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";

export function RecordingsScreen() {
  const route = useLegiWatchRoute(),
    [page, setPage] = useState(1),
    [type, setType] = useState("server");
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [browserPage, setBrowserPage] = useState(0);
  const server = useCapiroQuery(
    "legiwatch.recordings",
    { query: { page, pageSize: 25 } },
    { enabled: type === "server" },
  );
  const browser = useCapiroQuery(
    "legiwatch.session.list",
    { query: { limit: 25, cursor: cursors[browserPage] } },
    { enabled: type === "browser" },
  );
  return (
    <div className={styles.screen}>
      <LegiWatchTabs
        value={type}
        items={[
          { id: "server", label: "Server attendance" },
          { id: "browser", label: "My browser sessions" },
        ]}
        onChange={(value) => {
          setType(value);
          setPage(1);
        }}
      />
      {type === "server" ? (
        <StatusPanel
          loading={server.loading}
          error={server.error}
          onRetry={server.reload}
          empty={
            !server.loading && !server.error && !server.data?.rows.length
              ? "No server attendance scheduled"
              : undefined
          }
        >
          {server.data && (
            <>
              <div className={styles.list}>
                {server.data.rows.map((row) => (
                  <article key={row.id} className={styles.listItem}>
                    <div className={styles.row}>
                      <strong>{row.title}</strong>
                      <Badge>
                        {row.capture?.status ?? "Waiting for capture"}
                      </Badge>
                    </div>
                    <p className={styles.description}>
                      {hearingDate(row.date, row.startsAt)} ·{" "}
                      {row.committeeName}
                    </p>
                    {row.capture?.transcriptGapSeconds ? (
                      <p className={styles.gap}>
                        {row.capture.transcriptGapSeconds} seconds of transcript
                        gaps are recorded.
                      </p>
                    ) : null}
                    <ActionButton
                      onClick={() => route.navigate({ hearingId: row.id })}
                    >
                      Open hearing
                    </ActionButton>
                  </article>
                ))}
              </div>
              <PageControls
                page={page}
                total={server.data.total}
                pageSize={25}
                onChange={setPage}
              />
            </>
          )}
        </StatusPanel>
      ) : (
        <StatusPanel
          loading={browser.loading}
          error={browser.error}
          onRetry={browser.reload}
          empty={
            !browser.loading && !browser.error && !browser.data?.items.length
              ? "No saved browser sessions"
              : undefined
          }
        >
          <div className={styles.list}>
            {browser.data?.items.map((row) => (
              <article key={row.id} className={styles.listItem}>
                <div className={styles.row}>
                  <strong>{row.title}</strong>
                  <Badge>{row.status}</Badge>
                </div>
                <p className={styles.description}>
                  Recording policy: {row.recordingPolicy.replaceAll("_", " ")}
                </p>
                <ActionButton
                  onClick={() => route.navigate({ sessionId: row.id })}
                >
                  Open session
                </ActionButton>
              </article>
            ))}
          </div>
          <div className={styles.actions}>
            <ActionButton
              disabled={browserPage === 0}
              onClick={() => setBrowserPage((value) => value - 1)}
            >
              Newer sessions
            </ActionButton>
            <ActionButton
              disabled={
                !browser.data?.hasMore ||
                !browser.data.nextCursor ||
                browser.loading
              }
              onClick={() => {
                const next = browser.data?.nextCursor;
                if (!next) return;
                setCursors((values) => [
                  ...values.slice(0, browserPage + 1),
                  next,
                ]);
                setBrowserPage((value) => value + 1);
              }}
            >
              Older sessions
            </ActionButton>
          </div>
        </StatusPanel>
      )}
    </div>
  );
}
