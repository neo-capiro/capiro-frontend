import { type UserPreferencesResponse } from "@capiro/meri-client/user-preferences";
import archived from "../test/browser/user-preferences-fixture.json" with { type: "json" };

// Explicitly synthetic configured catalog; no provider qualification is claimed.
export const modelCatalog: UserPreferencesResponse["modelCatalog"] = {
  defaultSelection: {
    provider: "bedrock",
    modelId: "synthetic-model",
    effort: null,
  },
  models: [
    {
      provider: "bedrock",
      modelId: "synthetic-model",
      label: "Synthetic model",
      efforts: [null, "high"],
      available: true,
      unavailableReason: null,
    },
  ],
};

const currentDocument = (value: typeof archived.read | typeof archived.save) => ({
  ...structuredClone(value),
  preferences: { ...structuredClone(value.preferences), defaultModel: null },
  modelCatalog: structuredClone(modelCatalog),
});

/** Current synthetic projection of the immutable earlier application capture. */
export const currentPreferencesFixture = {
  ...structuredClone(archived),
  source:
    "Synthetic current-contract projection of the retained application capture; no live provider claim",
  read: currentDocument(archived.read),
  save: currentDocument(archived.save),
  readback: currentDocument(archived.readback),
  request: {
    ...structuredClone(archived.request),
    preferences: {
      ...structuredClone(archived.request.preferences),
      defaultModel: null,
    },
  },
};
