/** Selection hints only. Current client/resource admission stays with the receiver. */
export const strategyViews = ["library", "context", "review", "runs"] as const;
export type StrategyView = (typeof strategyViews)[number];
type Selection = {
  clientId?: string;
  view?: StrategyView;
  strategyId?: string;
  stepId?: string;
  create?: boolean;
};
const ownedKeys = ["clientId", "view", "strategy", "step", "create"] as const;

export function strategyHref(selection: Selection, previous = "") {
  const params = new URLSearchParams(previous);
  for (const key of ownedKeys) params.delete(key);
  if (selection.clientId) params.set("clientId", selection.clientId);
  if (selection.view && selection.view !== "library")
    params.set("view", selection.view);
  if (selection.strategyId) params.set("strategy", selection.strategyId);
  if (selection.stepId) params.set("step", selection.stepId);
  if (selection.create) params.set("create", "strategy");
  return `/modules/strategies${params.size ? `?${params}` : ""}`;
}

export function currentStrategyHref(
  clientId: string,
  strategyId: string,
  stepId?: string,
) {
  return strategyHref({ clientId, strategyId, stepId });
}

export function readStrategyNavigation(params: URLSearchParams) {
  const requestedView = params.get("view");
  const view: StrategyView = strategyViews.some(
    (view) => view === requestedView,
  )
    ? (requestedView as StrategyView)
    : "library";
  return {
    clientId: params.get("clientId") ?? "",
    strategyId: params.get("strategy") ?? undefined,
    stepId: params.get("step") ?? undefined,
    linked: params.has("strategy"),
    view,
    creating: params.get("create") === "strategy",
    invalid:
      ownedKeys.some((key) => params.getAll(key).length > 1) ||
      (params.has("step") && !params.has("strategy")) ||
      (params.has("create") &&
        (params.get("create") !== "strategy" ||
          params.has("strategy") ||
          view !== "library")),
  };
}

/** Resolve a node only within an already admitted current Strategy detail. */
export function currentStrategyStep<
  Node extends { id: string; strategyId: string; archivedAt?: string | null },
>(nodes: readonly Node[], strategyId: string, stepId: string) {
  const matches = nodes.filter((node) => node.id === stepId);
  const node = matches.length === 1 ? matches[0] : undefined;
  return node && node.strategyId === strategyId && node.archivedAt == null
    ? node
    : undefined;
}
