import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import type { UserPreferencesResponse } from "@capiro/meri-client/user-preferences";
import type { CascaderNode } from "@capiro/ui/cascader";

export type ModelSelection = NonNullable<
  ConversationSubmitRequest["modelSelection"]
>;
export type ModelCatalog = UserPreferencesResponse["modelCatalog"];
export const DEFAULT_MODEL_VALUE = "default";
const providerLabel = { bedrock: "Amazon Bedrock", "claude-api": "Claude API" };
// Qualification stays server-owned; this release enables only qualified Bedrock rows.
const modelEnabled = (model: ModelCatalog["models"][number]) =>
  model.provider === "bedrock" &&
  model.available &&
  model.unavailableReason === null;
export const selectionKey = (value: ModelSelection) =>
  JSON.stringify([value.provider, value.modelId, value.effort]);
export const effortLabel = (effort: ModelSelection["effort"]) =>
  effort === null
    ? "Model default"
    : effort === "xhigh"
      ? "Extra high"
      : effort[0]!.toUpperCase() + effort.slice(1);

/** Presentation derives exclusively from the admitted catalog; it cannot qualify a model. */
export function modelOptions(
  catalog: ModelCatalog,
  defaultLabel: string,
): CascaderNode<ModelSelection | null>[] {
  const providers = new Map<
    ModelSelection["provider"],
    CascaderNode<ModelSelection | null>
  >();
  for (const model of catalog.models) {
    let provider = providers.get(model.provider);
    if (!provider) {
      provider = {
        value: model.provider,
        label: providerLabel[model.provider],
        children: [],
      };
      providers.set(model.provider, provider);
    }
    provider.children!.push({
      value: JSON.stringify([model.provider, model.modelId]),
      label: model.label,
      disabled: !modelEnabled(model),
      description:
        model.provider !== "bedrock" ||
        model.unavailableReason === "provider_unconfigured"
          ? "Provider unavailable"
          : model.unavailableReason === "model_unqualified"
            ? "Model not qualified"
            : undefined,
      children: model.efforts.map((effort) => {
        const selection = {
          provider: model.provider,
          modelId: model.modelId,
          effort,
        };
        return {
          value: selectionKey(selection),
          label: effortLabel(effort),
          keywords: [provider.label, model.label, model.modelId],
          data: selection,
          disabled: !modelEnabled(model),
        };
      }),
    });
  }
  return [
    { value: DEFAULT_MODEL_VALUE, label: defaultLabel, data: null },
    ...providers.values(),
  ];
}

export function selectionAvailable(
  catalog: ModelCatalog | undefined,
  selection: ModelSelection | null,
) {
  return (
    selection === null ||
    !!catalog?.models.some(
      (model) =>
        modelEnabled(model) &&
        model.provider === selection.provider &&
        model.modelId === selection.modelId &&
        model.efforts.includes(selection.effort),
    )
  );
}

export function selectionLabel(
  catalog: ModelCatalog | undefined,
  selection: ModelSelection,
) {
  const model = catalog?.models.find(
    (row) =>
      row.provider === selection.provider && row.modelId === selection.modelId,
  );
  return `${providerLabel[selection.provider]} / ${model?.label ?? selection.modelId} / ${effortLabel(selection.effort)}`;
}
