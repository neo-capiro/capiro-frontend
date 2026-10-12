"use client";
import { useState } from "react";
import type { EvidenceKind, EvidenceRef } from "./EvidenceActions";

export type TrackingSelection = {
  kind: Exclude<EvidenceKind, "research">;
  id: string;
  version: number;
  saved: boolean;
};
/** Local selection is never a saved report or a delivery approval. */
export function useEvidenceSelection() {
  const [exact, setExact] = useState<{ kind: EvidenceKind; id: string } | null>(
    null,
  );
  const [tracking, setTracking] = useState<TrackingSelection | null>(null);
  const [refs, setRefs] = useState<EvidenceRef[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const select = (ref: EvidenceRef) => {
    setRefs((current) => [
      ...current.filter((item) => item.kind !== ref.kind || item.id !== ref.id),
      ref,
    ]);
    setExact(null);
  };
  const reset = () => {
    setExact(null);
    setTracking(null);
    setRefs([]);
    setBasketOpen(false);
    setBriefingOpen(false);
  };
  return {
    exact,
    setExact,
    tracking,
    setTracking,
    refs,
    select,
    reset,
    basketOpen,
    setBasketOpen,
    briefingOpen,
    setBriefingOpen,
    remove: (id: string) =>
      setRefs((current) => current.filter((ref) => ref.id !== id)),
  };
}
