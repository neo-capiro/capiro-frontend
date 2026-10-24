import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  modelOptions,
  selectionAvailable,
  selectionKey,
  selectionLabel,
  type ModelCatalog,
} from "../src/features/meri/model-selection/model-selection";
import { ModelSelectionPicker } from "../src/features/meri/model-selection/ModelSelectionPicker";
import { UserPreferencesForm } from "../src/features/meri/user-preferences/UserPreferencesForm";
import { USER_PREFERENCE_DEFAULTS } from "@capiro/meri-client/user-preferences";

const choice = {
  provider: "bedrock" as const,
  modelId: "synthetic-qualified",
  effort: null,
};
const catalog: ModelCatalog = {
  defaultSelection: choice,
  models: [
    {
      ...choice,
      label: "Synthetic qualified",
      efforts: [null, "high"],
      available: true,
      unavailableReason: null,
    },
    {
      provider: "claude-api",
      modelId: "synthetic-disabled",
      label: "Synthetic disabled",
      efforts: ["low"],
      available: false,
      unavailableReason: "provider_unconfigured",
    },
  ],
};

it("builds only catalog-supplied provider/model/effort leaves, with a separate default reset", () => {
  const options = modelOptions(catalog, "Use default");
  expect(options.map((row) => row.value)).toEqual([
    "default",
    "bedrock",
    "claude-api",
  ]);
  expect(options[1]!.children![0]!.children!.map((row) => row.data)).toEqual([
    choice,
    { ...choice, effort: "high" },
  ]);
  expect(options[2]!.children![0]).toMatchObject({
    disabled: true,
    description: "Provider unavailable",
  });
  expect(options[0]!.data).toBeNull();
  expect(selectionAvailable(catalog, { ...choice, effort: "low" })).toBe(false);
  expect(
    selectionAvailable(catalog, {
      provider: "claude-api",
      modelId: "synthetic-disabled",
      effort: "low",
    }),
  ).toBe(false);
  expect(selectionAvailable(undefined, choice)).toBe(false);
  expect(selectionAvailable(undefined, null)).toBe(true);
  expect(selectionKey(choice)).not.toEqual(
    selectionKey({ ...choice, effort: "high" }),
  );
  expect(selectionLabel(catalog, choice)).toContain("Model default");
});

it("single qualified row cannot advertise API or additional effort choices", () => {
  const minimal: ModelCatalog = {
    ...catalog,
    models: [{ ...catalog.models[0]!, efforts: [null] }],
  };
  const options = modelOptions(minimal, "Use default");
  expect(options).toHaveLength(2);
  expect(options[1]!.children![0]!.children).toHaveLength(1);
  expect(JSON.stringify(options)).not.toContain("claude-api");
});

it("enables only qualified Bedrock choices even if another provider is advertised available", () => {
  const restricted: ModelCatalog = {
    ...catalog,
    models: [
      catalog.models[0]!,
      { ...catalog.models[1]!, available: true, unavailableReason: null },
      {
        ...catalog.models[0]!,
        modelId: "synthetic-unqualified",
        available: false,
        unavailableReason: "model_unqualified",
      },
      {
        ...catalog.models[0]!,
        modelId: "synthetic-inconsistent",
        available: true,
        unavailableReason: "model_unqualified",
      },
    ],
  };
  const leaves = modelOptions(restricted, "Use default")
    .flatMap((provider) => provider.children ?? [])
    .flatMap((model) => model.children ?? []);
  expect(
    leaves.filter((leaf) => !leaf.disabled).map((leaf) => leaf.data),
  ).toEqual([choice, { ...choice, effort: "high" }]);
  for (const model of restricted.models.slice(1))
    expect(
      selectionAvailable(restricted, {
        provider: model.provider,
        modelId: model.modelId,
        effort: model.efforts[0]!,
      }),
    ).toBe(false);
});

it("renders the adopted compact trigger with selected path and preserves a removed choice visibly", () => {
  const html = renderToStaticMarkup(
    createElement(ModelSelectionPicker, {
      catalog,
      value: { ...choice, modelId: "removed" },
      onChange: () => {},
      compact: true,
      label: "Model for next message",
      disabled: true,
    }),
  );
  expect(html).toContain("cascader-trigger");
  expect(html).toContain("removed");
  expect(html).toContain("selection is unavailable");
  expect(html).toContain("disabled");
});

it("personal defaults use the shared picker and refuse unavailable persisted choices", () => {
  const html = renderToStaticMarkup(
    createElement(UserPreferencesForm, {
      document: {
        owner: { tenantId: "synthetic", actorId: "actor" },
        revision: 4,
        preferences: {
          ...USER_PREFERENCE_DEFAULTS,
          defaultModel: { ...choice, effort: "low" },
        },
        modelCatalog: catalog,
      },
      editable: true,
      save: () => {},
    }),
  );
  expect(html).toContain("Default model");
  expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  expect(html).toContain("Other stored settings are preserved");
});
