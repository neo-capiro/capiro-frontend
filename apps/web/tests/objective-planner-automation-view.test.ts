import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ObjectivePlannerAutomation } from "../src/features/portfolio/objectives/ObjectivePlannerAutomation";
const state = vi.hoisted(() => ({ actor: true, client: "00000000-0000-4000-8000-000000000002", request: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("../src/shared/portfolio/auth/identity", () => ({ useIdentity: () => ({}) }));
vi.mock("../src/shared/portfolio/auth/client-writer", () => ({ currentClientWriter: () => state.actor ? { tenantId: "synthetic", userId: "synthetic" } : undefined }));
vi.mock("../src/shared/session/SelectedClient", () => ({ useSelectedClient: () => ({ state: "authorized-client", client: { id: state.client, status: "active" } }) }));
vi.mock("../src/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({ useCapiro: () => ({ request: state.request }) }));
vi.mock("../src/features/portfolio/objectives/objective-planner-consent-recovery", () => ({ createPlannerConsentRecovery: () => ({}) }));
vi.mock("../src/features/portfolio/objectives/ObjectiveGovernedPlanner", () => ({ ObjectiveGovernedPlanner: () => createElement("p", {}, "Existing governed Planner output status") }));
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const selection = { query: { clientId: id(2), objectiveId: id(3), objectiveVersion: 2 },
  ids: { strategyId: id(5), strategyVersionId: id(6), generatedJobId: id(4) } };
beforeEach(() => { state.actor = true; state.client = id(2); state.request.mockReset(); });
it("labels separate consent and shows the canonical result owner without running a command during render", () => {
  const html = renderToStaticMarkup(createElement(ObjectivePlannerAutomation, { selection }));
  expect(html).toContain("separate from Strategy generation consent");
  expect(html).toContain("Authorize and prepare Planner");
  expect(html).toContain("Existing governed Planner output status");
  expect(html).toContain("disabled");
  expect(html).not.toContain("Continue plan preparation");
  expect(state.request).not.toHaveBeenCalled();
});
it.each(["actor", "client"])("withholds consent when current %s is unavailable", kind => {
  if (kind === "actor") state.actor = false; else state.client = id(99);
  const html = renderToStaticMarkup(createElement(ObjectivePlannerAutomation, { selection }));
  expect(html).not.toContain("Authorize and prepare Planner");
  expect(html).toContain("Verify your current client");
  expect(state.request).not.toHaveBeenCalled();
});
