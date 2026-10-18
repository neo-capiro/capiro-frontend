/** URL selection hints only; the Research API remains authoritative for access. */
export const researchPortfolioTabs = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "changes", label: "Changes" },
  { id: "analytics", label: "Analytics" },
  { id: "reviews", label: "Reviews" },
  { id: "settings", label: "Settings" },
  { id: "snapshots", label: "Snapshots" },
  { id: "subscriptions", label: "Subscriptions" },
] as const;

export type ResearchPortfolioView =
  (typeof researchPortfolioTabs)[number]["id"];

export type ResearchPortfolioFilters = {
  role: "" | "owner" | "editor" | "viewer";
  mode: "" | "manual" | "rules" | "hybrid";
  lifecycle: "active" | "archived" | "all";
};

export function readResearchPortfolioFilters(
  params: Pick<URLSearchParams, "get">,
): ResearchPortfolioFilters {
  const role = params.get("role");
  const mode = params.get("mode");
  const lifecycle = params.get("lifecycle");
  return {
    role:
      role === "owner" || role === "editor" || role === "viewer" ? role : "",
    mode:
      mode === "manual" || mode === "rules" || mode === "hybrid" ? mode : "",
    lifecycle:
      lifecycle === "archived" || lifecycle === "all" ? lifecycle : "active",
  };
}

export function readResearchPortfolioView(
  value: string | null,
): ResearchPortfolioView {
  return (
    researchPortfolioTabs.find((tab) => tab.id === value)?.id ?? "overview"
  );
}

export function researchPortfolioHref(
  selection: {
    portfolioId?: string;
    view: ResearchPortfolioView;
    filters?: ResearchPortfolioFilters;
  },
  previous = "",
) {
  const params = new URLSearchParams(previous);
  const filters = selection.filters ?? readResearchPortfolioFilters(params);
  params.delete("portfolioId");
  params.delete("view");
  params.delete("role");
  params.delete("mode");
  params.delete("lifecycle");
  params.delete("cursor");
  if (selection.portfolioId) params.set("portfolioId", selection.portfolioId);
  if (selection.view !== "overview") params.set("view", selection.view);
  if (filters.role) params.set("role", filters.role);
  if (filters.mode) params.set("mode", filters.mode);
  if (filters.lifecycle !== "active")
    params.set("lifecycle", filters.lifecycle);
  return `/modules/research-portfolios${params.size ? `?${params}` : ""}`;
}
