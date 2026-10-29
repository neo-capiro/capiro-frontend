"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { readRecovery, type RecoveryContract } from "./journal";

type Authority = (signal: AbortSignal, assert: () => void) => Promise<void>;
type Snapshot<Data> = { token: string; record: Data | null; error?: string };
/** Hydration only: the domain verifies current authority and owns every write. */
export function useRetainedIntent<Data>(
  scope: string,
  contract: RecoveryContract<Data>,
  authorize: Authority,
  lifetimeKey?: string,
) {
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot<Data>>();
  const lifetime = useRef<{
    token: string;
    controller: AbortController;
  } | null>(null);
  const authority = useRef(authorize);
  useLayoutEffect(() => {
    authority.current = authorize;
  }, [authorize]);
  const token = JSON.stringify([scope, revision, lifetimeKey]);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = { token, controller };
    const guard = () => controller.signal.throwIfAborted();
    void (async () => {
      try {
        await authority.current(controller.signal, guard);
        guard();
        const record = await readRecovery(scope, contract, guard);
        guard();
        setSnapshot({ token, record });
      } catch (cause) {
        if (!controller.signal.aborted)
          setSnapshot({
            token,
            record: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Saved intent recovery is unavailable.",
          });
      }
    })();
    return () => controller.abort();
  }, [scope, contract, token]);
  const current = snapshot?.token === token ? snapshot : undefined;
  const ready = Boolean(current && !current.error);
  const guard = () => {
    if (
      !lifetime.current ||
      lifetime.current.token !== token ||
      lifetime.current.controller.signal.aborted
    )
      throw new DOMException("The recovery context changed.", "AbortError");
  };
  return {
    ready,
    loading: !current,
    error: current?.error,
    record: ready ? current!.record : null,
    retry: () => setRevision((value) => value + 1),
    verify: async () => {
      guard();
      const controller = lifetime.current!.controller;
      await authority.current(controller.signal, guard);
      guard();
    },
    guard,
    signal: () => {
      guard();
      return lifetime.current!.controller.signal;
    },
    install: (record: Data | null) => {
      guard();
      setSnapshot({ token, record });
    },
    block: (cause: unknown) => {
      try {
        guard();
      } catch {
        return;
      }
      setSnapshot({
        token,
        record: null,
        error:
          cause instanceof Error
            ? cause.message
            : "Saved intent recovery is unavailable.",
      });
    },
  };
}
