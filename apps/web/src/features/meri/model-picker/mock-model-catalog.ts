/** DESIGN REFERENCE ONLY. No production endpoint or durable save exists here. */
export type ProviderId = "bedrock" | "anthropic";
export type Availability = Readonly<{
  availability: "available" | "held" | "unavailable";
  unavailableReason?: string;
}>;
export type ReasoningOption = Availability &
  Readonly<{ id: string; label: string }>;
export type ModelOption = Availability &
  Readonly<{
    id: string;
    label: string;
    reasoningLevels: readonly ReasoningOption[];
    defaultReasoningLevelId: string;
  }>;
export type ModelCatalogV1 = Readonly<{
  version: "meri.model-catalog.v1";
  revision: string;
  providers: readonly (Availability &
    Readonly<{
      id: ProviderId;
      label: string;
      models: readonly ModelOption[];
    }>)[];
}>;
export type ModelSelectionV1 = Readonly<{
  version: "meri.model-selection.v1";
  provider: ProviderId;
  modelId: string;
  reasoningLevelId: string;
  catalogRevision: string;
}>;
export type SelectionTarget =
  | Readonly<{ kind: "actor-default" }>
  | Readonly<{ kind: "conversation"; conversationId: string }>;
export type SelectionChangeV1 = Readonly<{
  version: "meri.model-selection-change.v1";
  target: SelectionTarget;
  requestId: string;
  expectedRevision: string;
  selection: ModelSelectionV1;
}>;
export type SelectionFailureCode =
  | "NOT_AUTHORIZED"
  | "STALE_REVISION"
  | "STALE_CATALOG"
  | "UNSUPPORTED_SELECTION"
  | "PROVIDER_UNAVAILABLE"
  | "CAPABILITY_HELD"
  | "INVALID_REQUEST";
export type SelectionReceiptV1 = Readonly<{
  version: "meri.model-selection-receipt.v1";
  target: SelectionTarget;
  requestId: string;
}> &
  (
    | Readonly<{
        outcome: "committed";
        revision: string;
        selection: ModelSelectionV1;
        appliesTo: "new-conversations" | "next-admitted-input";
      }>
    | Readonly<{ outcome: "rejected"; code: SelectionFailureCode }>
    | Readonly<{ outcome: "unknown"; reconciliationId: string }>
  );

// Synthetic data: deliberately not real model names, prices, IDs or capabilities.
// UI interaction with this object changes only a local, clearly labeled preview.
export const mockCatalog = {
  version: "meri.model-catalog.v1",
  revision: "synthetic-catalog-1",
  providers: [
    {
      id: "bedrock",
      label: "Amazon Bedrock",
      availability: "available",
      models: [
        {
          id: "synthetic-bedrock-model",
          label: "Example Bedrock model",
          availability: "available",
          defaultReasoningLevelId: "synthetic-standard",
          reasoningLevels: [
            {
              id: "synthetic-standard",
              label: "Standard",
              availability: "available",
            },
            {
              id: "synthetic-deep",
              label: "Deeper reasoning",
              availability: "held",
              unavailableReason: "Example held choice",
            },
          ],
        },
      ],
    },
    {
      id: "anthropic",
      label: "Claude API",
      availability: "available",
      models: [
        {
          id: "synthetic-claude-api-model",
          label: "Example Claude API model",
          availability: "available",
          defaultReasoningLevelId: "synthetic-adaptive",
          reasoningLevels: [
            {
              id: "synthetic-adaptive",
              label: "Adaptive",
              availability: "available",
            },
            {
              id: "synthetic-extended",
              label: "Extended",
              availability: "available",
            },
          ],
        },
      ],
    },
  ],
} as const satisfies ModelCatalogV1;
