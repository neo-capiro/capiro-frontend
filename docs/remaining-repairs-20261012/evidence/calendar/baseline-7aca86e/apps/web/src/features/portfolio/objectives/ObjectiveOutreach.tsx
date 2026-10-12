"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useApi } from "@/shared/portfolio/api/provider";
import { queryString } from "@/shared/portfolio/api/http";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { engagementSessionOperations } from "@/shared/capiro/operations/engagement-sessions";
import {
  objectiveDestinationQuery,
  objectiveOutreachDestination,
  requireObjectiveDestination,
} from "@/shared/capiro/operations/engagement-objective-destination";
import type { Objective } from "./contracts";
export function ObjectiveOutreach({
  objective,
  disabled,
}: {
  objective: Objective;
  disabled: boolean;
}) {
  const api = useApi(),
    router = useRouter();
  const [expanded, setExpanded] = useState(false),
    [sessionId, setSessionId] = useState(""),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error>();
  const selectId = useId();
  const active = useRef<AbortController | null>(null);
  useLayoutEffect(
    () => () => {
      active.current?.abort();
    },
    [api, objective.id, objective.version, disabled],
  );
  const sessions = useQuery({
    queryKey: [
      "objective-outreach-sessions",
      objective.clientId,
      objective.id,
      offset,
    ],
    enabled: expanded && !disabled,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `engagement/outreach-v3/sessions?${queryString({ limit: 100, offset })}`,
        engagementSessionOperations["engagement.sessions"].response,
        { signal },
      ),
  });
  async function openDestination() {
    if (disabled || busy || !sessionId || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      const query = objectiveDestinationQuery.parse({
        clientId: objective.clientId,
        objectiveId: objective.id,
        objectiveVersion: objective.version,
      });
      const response = await api.request(
        "core",
        `engagement/outreach-v3/sessions/${encodeURIComponent(sessionId)}/objective-destination?${queryString(query)}`,
        objectiveOutreachDestination,
        { signal: controller.signal },
      );
      controller.signal.throwIfAborted();
      requireObjectiveDestination(response, sessionId, query);
      router.push(
        `/modules/engagement?${queryString({ view: "outreach", session: response.destination.resourceId, ...query })}`,
      );
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause
            : new Error("Objective destination unavailable."),
        );
    } finally {
      if (active.current === controller) active.current = null;
      setBusy(false);
    }
  }
  return (
    <section className="card stack" aria-label="Objective destinations">
      <h3>Existing Outreach session</h3>
      <p>
        Open a currently authorized session for saved Objective version{" "}
        {objective.version}. This does not create a session or save an
        association.
      </p>
      {disabled && (
        <p>Save or discard editor changes before opening a destination.</p>
      )}
      <button
        type="button"
        className="button"
        disabled={disabled || busy}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? "Hide session selection"
          : "Choose existing Outreach session"}
      </button>
      {expanded && !disabled && (
        <>
          <QueryState
            pending={sessions.isPending}
            error={sessions.error}
            retry={() => void sessions.refetch()}
          />
          <label htmlFor={selectId}>Existing Outreach session</label>
          <select
            id={selectId}
            value={sessionId}
            disabled={busy}
            onChange={(event) => setSessionId(event.target.value)}
          >
            <option value="">Select a session</option>
            {sessions.isSuccess &&
              sessions.data.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={
                    item.status !== "active" || Boolean(item.archivedAt)
                  }
                >
                  {item.title ?? item.id} · {item.status}
                </option>
              ))}
          </select>
          <div className="row">
            <button
              type="button"
              className="button"
              disabled={offset === 0 || busy}
              onClick={() => {
                setOffset(offset - 100);
                setSessionId("");
              }}
            >
              Previous sessions
            </button>
            <button
              type="button"
              className="button"
              disabled={sessions.data?.length !== 100 || busy}
              onClick={() => {
                setOffset(offset + 100);
                setSessionId("");
              }}
            >
              More sessions
            </button>
          </div>
          <QueryState error={error} />
          <button
            type="button"
            className="button primary"
            disabled={
              !sessionId || busy || !sessions.isSuccess || sessions.isFetching
            }
            onClick={() => void openDestination()}
          >
            {busy
              ? "Checking current destination…"
              : "Open Objective-bound Outreach"}
          </button>
        </>
      )}
      <small>Creation and durable associations remain unavailable.</small>
    </section>
  );
}
