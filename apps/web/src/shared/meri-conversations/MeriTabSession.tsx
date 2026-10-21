"use client";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { meriTabStorageReady, syncMeriTabIdentity } from "./tab-journal";
import Link from "next/link";

type Status = "pending" | "ready" | "unavailable";
type Snapshot = { identity: string | null | undefined; status: Status };
const initial: Snapshot = { identity: undefined, status: "pending" };

/** Session lifecycle observation only; journal scopes still use native server identities. */
export function createMeriTabSession() {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const sync = (identity: string | null) => {
    let status: Status = "pending";
    try {
      syncMeriTabIdentity(identity);
      if (identity !== null)
        status = meriTabStorageReady() ? "ready" : "unavailable";
    } catch {
      status = "unavailable";
    }
    snapshot = { identity, status };
    listeners.forEach((listener) => listener());
  };
  return {
    sync,
    expire: () => sync(null),
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** No storage effects during render or unresolved Clerk loading. */
export function useMeriTabSession(identity: string | null | undefined) {
  const [owner] = useState(createMeriTabSession);
  const snapshot = useSyncExternalStore(
    owner.subscribe,
    owner.getSnapshot,
    owner.getServerSnapshot,
  );
  useEffect(() => {
    if (identity !== undefined) owner.sync(identity);
  }, [identity, owner]);
  return {
    status:
      snapshot.identity === identity ? snapshot.status : ("pending" as Status),
    expire: owner.expire,
  };
}

/** Storage failure contains Meri without taking Portfolio, Modules or Settings offline. */
export function MeriTabSessionGate({
  pathname,
  identity,
  status,
  children,
}: {
  pathname: string;
  identity: string | null | undefined;
  status: Status;
  children: ReactNode;
}) {
  if (pathname !== "/meri" && !pathname.startsWith("/meri/")) return children;
  if (status === "ready") return children;
  if (identity === null)
    return (
      <section role="status">
        <p>Sign in to continue.</p>
        <Link href="/sign-in">Sign in</Link>
      </section>
    );
  if (status === "unavailable")
    return (
      <section role="alert">
        <h2>Meri recovery is unavailable</h2>
        <p>
          This tab could not safely open its saved messages. Check browser
          storage access, then reload this page.
        </p>
      </section>
    );
  return <p role="status">Loading your Meri session…</p>;
}
