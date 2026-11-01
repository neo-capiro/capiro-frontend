"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Forecast } from "./contracts";
import { fetchForecastHistory } from "./api";
import {
  confidenceLabel,
  elapsedLabel,
  observationLabel,
  periodLabel,
} from "./presentation";
import styles from "./forecasts.module.css";

export function ForecastFacts({ item, now }: { item: Forecast; now: number }) {
  const elapsed =
    item.status === "published"
      ? elapsedLabel(item.period, new Date(now).toISOString())
      : null;
  return (
    <>
      <p className={styles.period}>{periodLabel(item.period)}</p>
      <p>
        {item.eventType === "proposed_rule"
          ? "Proposed-rule publication"
          : "Final-rule publication"}
        {" · "}
        {item.status === "withdrawn"
          ? "Withdrawn by publisher"
          : item.status === "source_completed"
            ? "Publisher reports completed"
            : "Publisher target"}
        {" · "}Revision {item.revision}
      </p>
      <p>{confidenceLabel}</p>
      {elapsed && <p className={styles.warning}>{elapsed}</p>}
      {item.completionEvidence && (
        <p>
          Publisher completion evidence: {item.completionEvidence.action} ·{" "}
          {item.completionEvidence.rawDate}. This does not create a confirmed
          Calendar event.
        </p>
      )}
      {item.withdrawalEvidence && (
        <p>
          Publisher withdrawal evidence: {item.withdrawalEvidence.action} ·{" "}
          {item.withdrawalEvidence.rawDate}.
        </p>
      )}
      <dl className={styles.facts}>
        <dt>Source</dt>
        <dd>
          <a href={item.source.url} target="_blank" rel="noopener noreferrer">
            Unified Agenda · {item.source.rin}
          </a>
        </dd>
        <dt>Publisher edition</dt>
        <dd>{item.source.edition}</dd>
        <dt>Publisher issued at</dt>
        <dd>{item.source.issuedAt ?? "Not supplied"}</dd>
        <dt>Source period text</dt>
        <dd>{item.period.raw || "Not supplied"}</dd>
        <dt>Observed at</dt>
        <dd>
          {item.observedAt} · {observationLabel(item.observedAt, now)}
        </dd>
        <dt>Revision recorded at</dt>
        <dd>{item.recordedAt}</dd>
      </dl>
    </>
  );
}

function ForecastHistory({ id, now }: { id: string; now: number }) {
  const api = useApi();
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ["government-forecast-history", id, page],
    queryFn: ({ signal }) => fetchForecastHistory(api, id, page, signal),
  });
  const data =
    history.isSuccess && !history.isFetching && !history.error
      ? history.data
      : null;
  return (
    <div className={styles.history}>
      <h4>Retained forecast revisions</h4>
      <QueryState
        pending={history.isFetching}
        error={history.error}
        retry={() => void history.refetch()}
      />
      {data && (
        <>
          <p>
            Showing {data.items.length} of {data.total} revisions, page {page}.
          </p>
          {data.items.map((item) => (
            <article key={item.revision} className={styles.revision}>
              <h5>
                {item.title} · Revision {item.revision}
              </h5>
              <ForecastFacts item={item} now={now} />
            </article>
          ))}
          <ForecastPaging
            page={page}
            pageSize={data.pageSize}
            total={data.total}
            setPage={setPage}
          />
        </>
      )}
    </div>
  );
}

export function ForecastPaging({
  page,
  pageSize,
  total,
  setPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
}) {
  return (
    <div className={styles.actions}>
      <button
        className="button"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous page
      </button>
      <span>Page {page}</span>
      <button
        className="button"
        disabled={page * pageSize >= total}
        onClick={() => setPage(page + 1)}
      >
        Next page
      </button>
    </div>
  );
}

function ForecastEntry({ item, now }: { item: Forecast; now: number }) {
  const [showHistory, setShowHistory] = useState(false);
  return (
    <li className={styles.entry}>
      <h3>{item.title}</h3>
      <ForecastFacts item={item} now={now} />
      <button
        className="button"
        aria-expanded={showHistory}
        onClick={() => setShowHistory(!showHistory)}
      >
        {showHistory ? "Hide revision history" : "View revision history"}
      </button>
      {showHistory && <ForecastHistory id={item.id} now={now} />}
    </li>
  );
}

export function ForecastList({
  items,
  now,
}: {
  items: Forecast[];
  now: number;
}) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <ForecastEntry
          key={`${item.id}:${item.revision}`}
          item={item}
          now={now}
        />
      ))}
    </ul>
  );
}
