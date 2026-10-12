"use client";

import { useEffect, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { AgendaItem } from "./agenda";
import { loadAgendaSources } from "./agenda-loader";
import type { CalendarRange } from "./range";

type SourceState = {
  items: AgendaItem[];
  loading: boolean;
  warnings: string[];
  rangeId?: string;
};

export function useAgendaSources(range: CalendarRange, enabled: boolean) {
  const api = useCapiro();
  const rangeId = `${range.firstDay}:${range.lastDay}`;
  const [state, setState] = useState<SourceState>({
    items: [],
    loading: enabled,
    warnings: [],
  });
  useEffect(() => {
    if (!enabled) {
      setState({ items: [], loading: false, warnings: [], rangeId });
      return;
    }
    const controller = new AbortController();
    setState({ items: [], loading: true, warnings: [], rangeId });
    loadAgendaSources(api, range, controller.signal).then((loaded) => {
      if (!controller.signal.aborted)
        setState({ ...loaded, loading: false, rangeId });
    });
    return () => controller.abort();
  }, [api, rangeId, range.firstDay, range.lastDay, enabled]);
  return enabled && state.rangeId === rangeId
    ? state
    : { items: [], loading: enabled, warnings: [] };
}
