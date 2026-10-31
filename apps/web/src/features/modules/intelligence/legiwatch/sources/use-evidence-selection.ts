"use client";
import { useState } from "react";
import type { EvidenceKind, EvidenceRef } from "./EvidenceActions";

/** Local selection is never a saved draft or a delivery approval. */
export function useEvidenceSelection() {
  const [exact, setExact] = useState<{ kind: EvidenceKind; id: string } | null>(
    null,
  );
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
  return {
    exact,
    setExact,
    refs,
    select,
    basketOpen,
    setBasketOpen,
    briefingOpen,
    setBriefingOpen,
    remove: (id: string) =>
      setRefs((current) => current.filter((ref) => ref.id !== id)),
  };
}
