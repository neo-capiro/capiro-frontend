"use client";
import { BriefingComposer } from "../more/BriefingComposer";
import { ExactEvidence, type EvidenceScope } from "./EvidenceActions";
import { EvidenceBasket } from "./EvidenceBasket";
import type { useEvidenceSelection } from "./use-evidence-selection";

export function EvidenceDialogs({
  selection,
  scope,
}: {
  selection: ReturnType<typeof useEvidenceSelection>;
  scope: EvidenceScope;
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
