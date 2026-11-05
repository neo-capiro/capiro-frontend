"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity, canAdminister } from "@/shared/portfolio/auth/identity";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { LdaCompanyResearch } from "./LdaCompanyResearch";
const counts = z.object({
  total: z.number(),
  processed: z.number(),
  successful: z.number(),
  rejected: z.number(),
  outstanding: z.number(),
  created: z.number(),
  alreadyPresent: z.number(),
});
export const importJobSchema = z.object({
  id: z.uuid(),
  requestId: z.string(),
  status: z.enum([
    "queued",
    "running",
    "partially_completed",
    "failed",
    "completed",
  ]),
  counts,
  stale: z.boolean(),
  terminal: z.boolean().optional(),
  items: z
    .array(
      z.object({
        ldaClientId: z.number().int(),
        outcome: z.enum(["pending", "created", "already_present", "rejected"]),
        code: z.string().nullable(),
        clientId: z.string().nullable(),
        clientName: z.string().nullable(),
        website: z.string().nullable().optional(),
        processedAt: z.string().nullable(),
      }),
    )
    .optional(),
});
const jobsSchema = z.object({
  jobs: z.array(importJobSchema),
  nextCursor: z.string().nullable().optional(),
});
export function ImportQueue({
  jobId,
  websites,
  autoStart = false,
}: {
  jobId?: string;
  websites?: Record<number, string>;
  autoStart?: boolean;
}) {
  const api = useApi();
  const identity = useIdentity();
  const [selected, setSelected] = useState<string>();
  const actor = [identity.data?.tenant?.id, identity.data?.user.id];
  const currentAccess =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.isPaused &&
    !identity.error &&
    Boolean(actor[0] && actor[1]) &&
    (identity.data?.role === "standard_user" ||
      canAdminister(identity.data?.role));
  const jobs = useInfiniteQuery({
    queryKey: ["portfolio-import-jobs", ...actor],
    enabled: currentAccess,
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) =>
      api.request(
        "core",
        `firm/import-jobs${pageParam ? `?${new URLSearchParams({ cursor: pageParam })}` : ""}`,
        jobsSchema,
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: (query) =>
      query.state.data?.pages
        .flatMap((page) => page.jobs)
        .some(
          (job) =>
            !["completed", "failed", "partially_completed"].includes(
              job.status,
            ),
        )
        ? 2000
        : false,
  });
  const jobRows =
    !currentAccess || !jobs.isSuccess || jobs.error
      ? []
      : (jobs.data?.pages.flatMap((page) => page.jobs) ?? []);
  const active = selected ?? jobId ?? jobRows[0]?.id;
  const detail = useQuery({
    queryKey: ["portfolio-import-job", ...actor, active],
    enabled: Boolean(active) && currentAccess,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `firm/import-jobs/${encodeURIComponent(active!)}`,
        importJobSchema.refine((job) => job.id === active),
        { signal },
      ),
    refetchInterval: (query) =>
      query.state.data &&
      !query.state.data.terminal &&
      ["queued", "running"].includes(query.state.data.status)
        ? 2000
        : false,
  });
  return (
    <section className="stack" aria-label="LDA import queue">
      <h2>Import queue</h2>
      <p className="muted">
        Saved jobs and research remain available when you reopen this screen.
      </p>
      <QueryState
        pending={jobs.isPending}
        error={jobs.error}
        retry={() => void jobs.refetch()}
      />
      {jobRows.length ? (
        <label>
          Import job
          <select
            value={active ?? ""}
            onChange={(event) => setSelected(event.target.value)}
          >
            {jobRows.map((job) => (
              <option key={job.id} value={job.id}>
                {job.status.replaceAll("_", " ")} · {job.counts.processed}/
                {job.counts.total} clients
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted">No saved imports yet.</p>
      )}
      <QueryState
        pending={Boolean(active) && detail.isPending}
        error={detail.error}
        retry={() => void detail.refetch()}
      />
      {currentAccess && !jobs.error && jobs.hasNextPage && (
        <button
          className="button"
          disabled={jobs.isFetchingNextPage}
          onClick={() => void jobs.fetchNextPage()}
        >
          Load older imports
        </button>
      )}
      {currentAccess && detail.isSuccess && !detail.error && detail.data && (
        <>
          <p role="status">
            {detail.data.status.replaceAll("_", " ")} ·{" "}
            {detail.data.counts.created} created ·{" "}
            {detail.data.counts.alreadyPresent} already present ·{" "}
            {detail.data.counts.rejected} skipped ·{" "}
            {detail.data.counts.outstanding} outstanding
          </p>
          {detail.data.stale && (
            <p role="status">
              This job has not reported progress recently. Refresh to check its
              saved status.
            </p>
          )}
          {detail.data.items?.map((item) => (
            <article key={item.ldaClientId} className="card stack">
              <header className="row between">
                <strong>
                  {item.clientName ?? `LDA client ${item.ldaClientId}`}
                </strong>
                <span className="chip">
                  {item.outcome.replaceAll("_", " ")}
                </span>
              </header>
              {item.code && (
                <small>
                  {item.code === "CLIENT_SLOT_LIMIT"
                    ? "Capacity refused"
                    : item.code === "LDA_CLIENT_NOT_FOUND"
                      ? "Source unavailable"
                      : item.code.replaceAll("_", " ")}
                </small>
              )}
              {item.clientId && (
                <>
                  <Link href={`/portfolio/${item.clientId}`}>
                    Open profile ↗
                  </Link>
                  <details
                    open={
                      autoStart &&
                      active === jobId &&
                      item.outcome === "created"
                    }
                  >
                    <summary>Research and review</summary>
                    <LdaCompanyResearch
                      key={`${actor.join(":")}:${item.clientId}`}
                      clientId={item.clientId}
                      ldaClientId={item.ldaClientId}
                      name={item.clientName ?? `LDA client ${item.ldaClientId}`}
                      website={item.website ?? websites?.[item.ldaClientId]}
                    />
                  </details>
                </>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
