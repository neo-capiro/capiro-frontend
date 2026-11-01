"use client";
import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  readProcurementSelection,
  writeProcurementSelection,
} from "./procurement-selection";

export function useProcurementSelection() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const navigating = useRef(false);
  useEffect(() => {
    if (!pending) navigating.current = false;
  }, [pending, params]);
  const selection = readProcurementSelection(params);
  const keys = selection.scope?.awardIdentityKeys ?? [];
  const navigate = (next: URLSearchParams) => {
    // Serialize URL mutations: a second click must not reuse pre-navigation keys.
    if (navigating.current) return;
    navigating.current = true;
    startTransition(() =>
      router.push(`${pathname}?${next}`, { scroll: false }),
    );
  };
  const replace = (nextKeys: readonly string[]) =>
    navigate(
      writeProcurementSelection(
        new URLSearchParams(params),
        nextKeys.length ? { awardIdentityKeys: nextKeys } : null,
      ),
    );
  return {
    ...selection,
    pending,
    keys,
    clientId: params.get("clientId") ?? "",
    update: (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      navigate(next);
    },
    clear: () => replace([]),
    latest: () => replace(keys),
    remove: (key: string) => replace(keys.filter((entry) => entry !== key)),
    toggle: (key: string) => {
      if (keys.includes(key)) replace(keys.filter((entry) => entry !== key));
      else if (!selection.error && keys.length < 25) replace([...keys, key]);
    },
  };
}
