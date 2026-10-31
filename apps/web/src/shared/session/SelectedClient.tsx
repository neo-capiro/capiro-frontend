"use client";
import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../portfolio/api/provider";
import {
  currentActorKey,
  useCurrentActor,
} from "../portfolio/auth/current-actor";
import { clientSchema, type Client } from "./client-contract";

export type SelectedClient =
  | { state: "no-selection" }
  | { state: "loading"; requestedId: string }
  | { state: "authorized-client"; requestedId: string; client: Client }
  | { state: "unavailable"; requestedId: string };
const Context = createContext<SelectedClient>({ state: "no-selection" });
export const useSelectedClient = () => useContext(Context);
export function SelectedClientProvider({
  requestedId,
  children,
}: {
  requestedId?: string;
  children: ReactNode;
}) {
  const api = useApi();
  const actor = useCurrentActor();
  const valid = clientSchema.shape.id.safeParse(requestedId).success;
  // The SAME actor-scoped entry the pages read ([portfolio, client, id, actorKey]), so this
  // gate shares their cache record instead of keeping a second actor-less one. The shape is
  // pinned against clients/client-read.ts by tests/portfolio371-complete.test.ts, because the
  // foundations layer may not import a feature module to reuse its builder.
  const query = useQuery({
    queryKey: ["portfolio", "client", requestedId, currentActorKey(actor)],
    enabled: Boolean(requestedId && valid && actor),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/${encodeURIComponent(requestedId!)}`,
        clientSchema.refine(
          (client) => client.id === requestedId,
          "Client association mismatch",
        ),
        { signal },
      ),
  });
  const value: SelectedClient = !requestedId
    ? { state: "no-selection" }
    : !valid || query.error
      ? { state: "unavailable", requestedId }
      : query.isPending || query.isFetching
        ? { state: "loading", requestedId }
        : { state: "authorized-client", requestedId, client: query.data };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function SelectedClientGate({ children }: { children: ReactNode }) {
  const selected = useSelectedClient();
  if (selected.state === "loading")
    return <p role="status">Loading selected client…</p>;
  if (selected.state === "unavailable")
    return (
      <section role="alert">
        <h2>Selected client unavailable</h2>
        <p>
          This client could not be verified for your current session. Return to
          Portfolio to choose a permitted client.
        </p>
        <Link href="/portfolio">Open Portfolio</Link>
      </section>
    );
  return children;
}
