import { expect, it } from "vitest";
import { calendarOperations } from "./operations/calendar";
import { directoryOperations } from "./operations/directory";
import { directoryObjectiveOperations } from "./operations/directory-objective-destination";
import { engagementOperations } from "./operations/engagement";
import { intelligenceOperations } from "./operations/intelligence";
import { legiwatchOperations } from "./operations/legiwatch";
import { plannerOperations } from "./operations/planner";
import { researchPortfolioOperations } from "./operations/research-portfolios";
import { settingsOperations } from "./operations/settings";
import { settingsAdminOperations } from "./operations/settings-admin";
import { strategiesOperations } from "./operations/strategies";
import { workspaceOperations } from "./operations/workspace";
import { capiroOperations } from "./registry";
import { onboardFunnelOperations } from "./operations/onboard-funnel";
import { onboardSetupOperations } from "./operations/onboard-setup";
import { onboardCoreOperations } from "./operations/onboard-core";

it("imports the complete reviewed allowlist safely and exposes no silently overwritten operation", () => {
  const groups = [
    settingsOperations,
    plannerOperations,
    engagementOperations,
    workspaceOperations,
    strategiesOperations,
    directoryOperations,
    directoryObjectiveOperations,
    calendarOperations,
    legiwatchOperations,
    settingsAdminOperations,
    intelligenceOperations,
    researchPortfolioOperations,
    onboardFunnelOperations,
    onboardSetupOperations,
    onboardCoreOperations,
  ];
  const declared = groups.flatMap((group) => Object.keys(group));
  expect(new Set(declared).size).toBe(declared.length);
  expect(Object.keys(capiroOperations)).toHaveLength(declared.length);
  expect(declared.length).toBeGreaterThan(0);
});
it("applies configured service prefixes once and ties the hearing socket to its actual gateway", () => {
  for (const operation of Object.values(capiroOperations))
    expect(operation.path).not.toMatch(
      /^\/(?:api|strategy-api|workspace-api|intel-api|onboard-api)(?:\/|$)/,
    );
  const ticket = capiroOperations["legiwatch.session.wsTicket"];
  expect(ticket.service).toBe("intelligence");
  expect(ticket.path).toBe("/hearings/:id/ws-ticket");
  expect(ticket.websocket).toEqual({
    path: "/live",
    sessionParam: "id",
    sessionQuery: "sessionId",
    ticketField: "ticket",
    ticketQuery: "ticket",
  });
});
