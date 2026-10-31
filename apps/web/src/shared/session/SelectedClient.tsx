"use client";
import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../portfolio/api/provider";
import { useCurrentActor } from "../portfolio/auth/current-actor";
import { useIdentity } from "../portfolio/auth/identity";
import { clientReadQueryOptions } from "../portfolio/api/client-read";
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
  const cache = useQueryClient();
  const actor = useCurrentActor();
  const valid = clientSchema.shape.id.safeParse(requestedId).success;
  // Module routes can mount without a Portfolio identity consumer, and changing
  // client disposes the cache. Start the same canonical identity read here.
  const identity = useIdentity({ enabled: Boolean(requestedId && valid) });
  // The ONE canonical read: same key, same receipt checks (requested id, tenant, current
  // actor before and after the request). This provider no longer keeps a weaker producer on
  // the shared key.
  const options = clientReadQueryOptions(api, cache, requestedId ?? "", actor);
  // ...but the canonical producer enables on the actor ALONE, so the provider's own
  // selection condition has to stay in front of it: with no requested id, or an id that is
  // not a client id, nothing is read at all. Both are part of this provider's contract and
  // are mounted on General routes, so the guard cannot live only in the value branch below.
  const query = useQuery({
    ...options,
    enabled: Boolean(options.enabled && requestedId && valid),
  });
  const value: SelectedClient = !requestedId
    ? { state: "no-selection" }
    : !valid || identity.error || query.error
      ? { state: "unavailable", requestedId }
      : identity.isPending
        ? { state: "loading", requestedId }
        : !actor
          ? { state: "unavailable", requestedId }
          : query.isPending
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
