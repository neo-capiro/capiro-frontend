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
import { objectiveOperationalOperations } from "./operations/objective-operational";
import { governedObjectiveGenerationReadOperation } from "./operations/objective-governed-generation";
import { governedObjectiveOutputsReadOperation } from "./operations/objective-governed-outputs";
import { governedObjectiveStrategyIntakeOperation } from "./operations/objective-governed-strategy-intake";
import {
  firstChatCoreOperation,
  firstChatCoreOperationKey,
  firstChatV2Operation,
  firstChatV2OperationKey,
} from "./operations/meri-first-chat";

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
    objectiveOperationalOperations,
    {
      "objectives.governedGeneration.read":
        governedObjectiveGenerationReadOperation,
      "objectives.governedOutputs.read": governedObjectiveOutputsReadOperation,
      "objectives.governedStrategy.intake":
        governedObjectiveStrategyIntakeOperation,
    },
    {
      [firstChatCoreOperationKey]: firstChatCoreOperation,
      [firstChatV2OperationKey]: firstChatV2Operation,
    },
  ];
  const declared = groups.flatMap((group) => Object.keys(group));
  expect(new Set(declared).size).toBe(declared.length);
  expect(Object.keys(capiroOperations)).toHaveLength(declared.length);
  expect(Object.keys(capiroOperations).sort()).toEqual(declared.sort());
  expect(declared.length).toBeGreaterThan(0);
});
it("registers only the reviewed client and explicit General bootstrap contracts", () => {
  expect(capiroOperations[firstChatCoreOperationKey]).toBe(
    firstChatCoreOperation,
  );
  expect(capiroOperations[firstChatV2OperationKey]).toBe(firstChatV2Operation);
  expect(
    Object.keys(capiroOperations).filter((key) =>
      key.startsWith("meri.conversation.bootstrap"),
    ),
  ).toEqual([firstChatCoreOperationKey, firstChatV2OperationKey]);
  expect(firstChatV2Operation.service).toBe("core");
  expect(firstChatV2Operation.method).toBe("POST");
  expect(firstChatV2Operation.path).toBe("/clio/conversations/bootstrap");
  expect(firstChatV2Operation.authentication).toBe("clerk-session");
});
it("registers only the reviewed governed Objective operations", () => {
  expect(capiroOperations["objectives.governedGeneration.read"]).toBe(
    governedObjectiveGenerationReadOperation,
  );
  expect(capiroOperations["objectives.governedOutputs.read"]).toBe(
    governedObjectiveOutputsReadOperation,
  );
  expect(capiroOperations["objectives.governedStrategy.intake"]).toBe(
    governedObjectiveStrategyIntakeOperation,
  );
  expect(
    Object.keys(capiroOperations).filter((key) =>
      key.startsWith("objectives.governed"),
    ),
  ).toEqual([
    "objectives.governedGeneration.read",
    "objectives.governedOutputs.read",
    "objectives.governedStrategy.intake",
  ]);
  expect(governedObjectiveGenerationReadOperation.method).toBe("GET");
  expect(governedObjectiveOutputsReadOperation.method).toBe("GET");
  expect(governedObjectiveStrategyIntakeOperation.method).toBe("POST");
});
it("registers the pinned, read-only Personnel detail contract once", () => {
  const operation = capiroOperations["directory.personnelDetail"];
  expect(operation).toBe(directoryOperations["directory.personnelDetail"]);
  expect(operation.service).toBe("core");
  expect(operation.method).toBe("GET");
  expect(operation.path).toBe("/acquisition-personnel/:id");
  expect(operation.source).toContain(
    "51c157444ac43035eeb489ff46aee5a4e89ba3ac",
  );
  expect(
    operation.request.safeParse({
      params: { id: "00000000-0000-4000-8000-000000000001" },
    }).success,
  ).toBe(true);
  expect(
    operation.request.safeParse({ params: { id: "not-an-id" } }).success,
  ).toBe(false);
  expect(
    operation.request.safeParse({
      params: { id: "00000000-0000-4000-8000-000000000001" },
      body: {},
    }).success,
  ).toBe(false);
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
