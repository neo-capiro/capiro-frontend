"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearSettingsWrite,
  persistSettingsWrite,
  restoreSettingsWrite,
} from "./security-write-journal";
import type {
  SettingsWrite,
  SettingsWriteJournal,
} from "./security-write-types";

/** Adapt the existing scoped query cache and nonreplayable session journal. */
export function useSettingsWriteJournal(scopeKey: string) {
  const cache = useQueryClient();
  const journal = useMemo<SettingsWriteJournal>(() => {
    const queryKey = ["settings-security-write", scopeKey];
    const current = () => cache.getQueryData<SettingsWrite>(queryKey);
    cache.setQueryDefaults(queryKey, { gcTime: Infinity });
    if (typeof window !== "undefined" && !current()) {
      const retained = restoreSettingsWrite(window.sessionStorage, scopeKey);
      if (retained) cache.setQueryData(queryKey, retained);
    }
    return {
      scopeKey,
      current,
      record: (write) => {
        cache.setQueryData(queryKey, write);
      },
      persist: (write, input) =>
        persistSettingsWrite(window.sessionStorage, scopeKey, write, input),
      clear: (write) => {
        clearSettingsWrite(window.sessionStorage, scopeKey, write);
        if (current()?.attemptId === write.attemptId)
          cache.removeQueries({ queryKey, exact: true });
      },
      markUnknown: (write) => {
        if (current()?.attemptId === write.attemptId)
          cache.setQueryData(queryKey, { ...write, state: "unknown" });
      },
    };
  }, [cache, scopeKey]);
  const pending = useSyncExternalStore(
    useCallback((notify) => cache.getQueryCache().subscribe(notify), [cache]),
    journal.current,
    () => undefined,
  );
  return { journal, pending };
}
