"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Temporal } from "temporal-polyfill";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { validDay } from "@/shared/portfolio/date/civil";
import { useMeetingClock } from "../useMeetingClock";
import { fetchForecasts, type ForecastFilter } from "./api";
import { ForecastList, ForecastPaging } from "./ForecastList";
import {
  downloadForecasts,
  forecastsCsv,
  observationLabel,
} from "./presentation";
import styles from "./forecasts.module.css";

function ForecastFilters({
  filter,
  setFilter,
}: {
  filter: ForecastFilter;
  setFilter: (filter: ForecastFilter) => void;
}) {
  const [from, setFrom] = useState(filter.from);
  const [to, setTo] = useState(filter.to);
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    const first = validDay(from);
    const last = validDay(to);
    const days =
      first && last ? Temporal.PlainDate.from(first).until(last).days : 0;
    if (!first || !last || days <= 0 || days > 366) {
      setError("Choose a valid civil-date range of 1–366 days.");
      return;
    }
    setError(null);
    setFilter({ ...filter, from: first, to: last, page: 1 });
  }
  return (
    <form onSubmit={submit} className={styles.filters}>
      <label>
        From (inclusive)
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          required
        />
      </label>
      <label>
        Before (exclusive)
        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          required
        />
      </label>
      <button className="button" type="submit">
        Apply range
      </button>
      <label>
        <input
          type="checkbox"
          checked={filter.includeWithdrawn}
          onChange={(event) =>
            setFilter({
              ...filter,
              includeWithdrawn: event.target.checked,
              page: 1,
            })
          }
        />
        Include ended forecasts (withdrawn or publisher-completed)
      </label>
      <label>
        <input
          type="checkbox"
          checked={filter.includeUndated}
          onChange={(event) =>
            setFilter({
              ...filter,
              includeUndated: event.target.checked,
              page: 1,
            })
          }
        />
        Include undetermined timing
      </label>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function ForecastWindows({ from, to }: { from: string; to: string }) {
  const api = useApi();
  const now = useMeetingClock();
  const [filter, setFilter] = useState<ForecastFilter>({
    from,
    to,
    page: 1,
    includeWithdrawn: false,
    includeUndated: false,
  });
  const query = useQuery({
    queryKey: ["government-forecast-windows", filter],
    queryFn: ({ signal }) => fetchForecasts(api, filter, signal),
  });
  const data =
    query.isSuccess && !query.isFetching && !query.error ? query.data : null;
  return (
    <section className={styles.panel} aria-label="Government forecast windows">
      <h2>Government forecast windows</h2>
      <p>
        Global regulatory windows from the Unified Agenda, not client-specific
        recommendations. Approximate publisher targets are separate from
        confirmed events and deadlines.
      </p>
      <p>
        Months remain calendar months in every timezone. A changed or elapsed
        window does not confirm an event occurred.
      </p>
      <ForecastFilters filter={filter} setFilter={setFilter} />
      <QueryState
        pending={query.isFetching}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          <p>
            Publisher edition: {data.coverage.edition ?? "Unavailable"}. Latest
            successful source check:{" "}
            {data.coverage.lastSuccessfulCheckAt ?? "Unavailable"} ·{" "}
            {observationLabel(data.coverage.lastSuccessfulCheckAt, now)}.
          </p>
          <p>
            Checking an unchanged edition does not renew its publication date or
            guarantee its targets remain accurate.
          </p>
          {data.coverage.partial && (
            <p role="status" className={styles.warning}>
              Partial source coverage: {data.coverage.acceptedCount} accepted
              and {data.coverage.rejectedCount} rejected entries. Missing or
              ambiguous entries do not establish absence of government events.
            </p>
          )}
          {data.coverage.lastCheckStatus !== "success" && (
            <p role="status" className={styles.warning}>
              {data.coverage.lastCheckStatus === "failed"
                ? "Latest source check failed"
                : "Source coverage unavailable"}
              {data.coverage.lastAttemptAt
                ? ` · attempted ${data.coverage.lastAttemptAt}`
                : ""}
              . Retained observations are not new publisher evidence.
            </p>
          )}
          <p>
            Showing {data.items.length} of {data.total} matching windows ·{" "}
            {filter.from} through before {filter.to}.
          </p>
          {data.items.length === 0 && (
            <p>
              {data.coverage.lastCheckStatus === "unavailable"
                ? "No qualified forecast catalog is available."
                : data.coverage.partial
                  ? "No retained windows match this selection in the partial catalog. This is not a complete no-forecasts result."
                  : "No retained windows match this selection. This is not complete government-event coverage."}
            </p>
          )}
          <button
            className="button"
            disabled={data.items.length === 0}
            onClick={() =>
              downloadForecasts(
                forecastsCsv(data.items, filter, now, data.coverage),
              )
            }
          >
            Export loaded page as CSV
          </button>
          <p>
            Export includes only this page and preserves approximate periods,
            source, observation age, revision and withdrawal. Exact
            calendar-event export is unavailable.
          </p>
          <ForecastList items={data.items} now={now} />
          <ForecastPaging
            page={filter.page}
            pageSize={data.pageSize}
            total={data.total}
            setPage={(page) => setFilter({ ...filter, page })}
          />
        </>
      )}
    </section>
  );
}
