"use client";
import { useEffect, useRef, useState } from "react";
import { CapiroApiError } from "../../../../../shared/capiro/http";

type Proposal<T> = {
  phase: "idle" | "pending" | "proposed" | "unknown" | "used";
  version?: number;
  result?: T;
  reason?: string;
};
/** Local review state only; the existing mutation hook owns transport and cancellation. */
export function useProviderProposal<T>(source: string) {
  const [scope, setScope] = useState({ source, version: 0 });
  if (scope.source !== source) setScope({ source, version: scope.version + 1 });
  const [state, setState] = useState<Proposal<T>>({ phase: "idle" });
  const active = useRef(false),
    consumed = useRef(false),
    mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const blocked = state.phase === "pending" || state.phase === "unknown";
  const result =
    state.phase === "proposed" && state.version === scope.version
      ? state.result
      : undefined;
  const run = async (request: () => Promise<T>) => {
    if (active.current || blocked) return;
    active.current = true;
    consumed.current = false;
    const version = scope.version;
    setState({ phase: "pending", version });
    try {
      const value = await request();
      if (mounted.current)
        setState({ phase: "proposed", version, result: value });
    } catch (error) {
      if (mounted.current)
        setState({
          phase: "unknown",
          version,
          reason: error instanceof CapiroApiError ? error.message : undefined,
        });
    } finally {
      active.current = false;
    }
  };
  return {
    result,
    reason: state.reason,
    blocked,
    run,
    phase:
      state.phase === "proposed" && state.version !== scope.version
        ? ("stale" as const)
        : state.phase,
    discard: () => {
      if (!blocked) setState({ phase: "idle" });
    },
    useResult: (apply: (value: T) => void) => {
      if (!result || consumed.current || active.current || blocked)
        return false;
      consumed.current = true;
      setState({ phase: "used" });
      apply(result);
      return true;
    },
  };
}
export type ProviderProposal<T> = ReturnType<typeof useProviderProposal<T>>;
