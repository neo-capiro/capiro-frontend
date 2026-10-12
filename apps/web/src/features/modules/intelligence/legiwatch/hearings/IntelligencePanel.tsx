"use client";
import { useEffect, useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { timecode } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";

export function IntelligencePanel({
  hearingId,
  relevantOnly = false,
}: {
  hearingId: string;
  relevantOnly?: boolean;
}) {
  const route = useLegiWatchRoute();
  const [cursors, setCursors] = useState<string[]>([]);
  const contextKey = JSON.stringify([hearingId, route.clientId, relevantOnly]);
  const [previousContext, setPreviousContext] = useState(contextKey);
  if (contextKey !== previousContext) { setPreviousContext(contextKey); setCursors([]); }
  const result = useCapiroQuery("legiwatch.intelligence", {
    params: { id: hearingId },
    query: {
      clientId: route.clientId || undefined,
      onlyRelevant: relevantOnly,
      limit: 250,
      cursor: cursors.at(-1),
    },
  });
  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <h2>{relevantOnly ? "Client relevance" : "Hearing intelligence"}</h2>
        <ActionButton onClick={result.reload}>Refresh</ActionButton>
      </div>
      {relevantOnly && !route.clientId && (
        <p className={styles.banner}>
          Choose a client in the module scope to inspect that client’s
          relevance.
        </p>
      )}
      <StatusPanel
        loading={result.loading}
        error={result.error}
        onRetry={result.reload}
        empty={
          !result.loading && !result.error && !result.data?.items.length
            ? "No retained findings are available"
            : undefined
        }
      >
        {result.data && (
          <>
            <p className={styles.description}>{result.data.disclaimer}</p>
            <div className={styles.list}>
              {result.data.items.map((item) => (
                <article className={styles.listItem} key={item.id}>
                  <div className={styles.row}>
                    <strong>{item.title}</strong>
                    <Badge tone={item.preliminary ? "warning" : "neutral"}>
                      {item.preliminary
                        ? "Preliminary"
                        : item.insightType.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p>{item.summary}</p>
                  <blockquote className={styles.banner}>
                    <strong>
                      Exact transcript evidence ·{" "}
                      {timecode(item.evidence.startMs)}
                    </strong>
                    {item.evidence.text ||
                      "The finding references a retained segment; open the transcript for its exact text."}
                  </blockquote>
                  {item.relevance.map((relevance) => (
                    <p className={styles.description} key={relevance.id}>
                      {relevance.clientName || relevance.clientId}:{" "}
                      {relevance.rationale}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            <Badge>{result.data.status}</Badge>
            <div className={styles.actions}>
              <ActionButton
                disabled={!cursors.length}
                onClick={() => setCursors((previous) => previous.slice(0, -1))}
              >
                Previous findings
              </ActionButton>
              <ActionButton
                disabled={!result.data.hasMore || !result.data.nextCursor}
                onClick={() =>
                  setCursors((previous) => [
                    ...previous,
                    result.data!.nextCursor!,
                  ])
                }
              >
                Next findings
              </ActionButton>
            </div>
          </>
        )}
      </StatusPanel>
    </section>
  );
}
