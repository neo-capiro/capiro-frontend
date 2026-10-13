"use client";
import { BriefingComposer } from "../more/BriefingComposer";
import {
  ExactEvidence,
  TrackEvidence,
  type EvidenceScope,
} from "./EvidenceActions";
import { EvidenceBasket } from "./EvidenceBasket";
import type { useEvidenceSelection } from "./use-evidence-selection";

export function EvidenceDialogs({
  selection,
  scope,
  reload,
}: {
  selection: ReturnType<typeof useEvidenceSelection>;
  scope: EvidenceScope;
  reload: () => void;
}) {
  return (
    <>
      {selection.exact && (
        <ExactEvidence
          {...selection.exact}
          scope={scope}
          onClose={() => selection.setExact(null)}
          onSelect={selection.select}
        />
      )}
      {selection.tracking && (
        <TrackEvidence
          {...selection.tracking}
          scope={scope}
          onClose={() => selection.setTracking(null)}
          onSaved={reload}
        />
      )}
      {selection.basketOpen && (
        <EvidenceBasket
          refs={selection.refs}
          onRemove={selection.remove}
          onClose={() => selection.setBasketOpen(false)}
          onBriefing={() => {
            selection.setBasketOpen(false);
            selection.setBriefingOpen(true);
          }}
        />
      )}
      {selection.briefingOpen && (
        <BriefingComposer
          evidenceRefs={selection.refs}
          {...scope}
          onClose={() => selection.setBriefingOpen(false)}
        />
      )}
    </>
  );
}
