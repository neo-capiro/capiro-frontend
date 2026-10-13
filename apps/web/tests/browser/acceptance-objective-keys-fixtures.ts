import { expect, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json, objective } from "./fixtures";
import {
  boundStrategy,
  strategyId,
  strategySummary,
} from "../objective-work-fixtures";
import { session, sessionId } from "../newsletter-staging-fixtures";

export const objectiveKeysPath = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
export const nextObjectiveClient = "10000000-0000-4000-8000-000000000002";
export const nextObjectiveId = "30000000-0000-4000-8000-000000000002";
export const nextObjectivePath = `/portfolio/${nextObjectiveClient}/objectives?objective=${nextObjectiveId}`;
export const boundOutreach = {
  ...session,
  spec: {
    ...session.spec,
    sponsor: { kind: "client", label: null, clientRefs: [{ clientId }] },
  },
  destination: {
    kind: "outreach_session",
    resourceId: sessionId,
    clientId,
    objectiveId: objective.id,
    objectiveVersion: objective.version,
    objectiveRevisionId: "50000000-0000-4000-8000-000000000001",
    destinationStateVersion: 3,
  },
};

export async function objectiveKeyFixtures(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    record: objective,
    writes: [] as { method: string; body: unknown }[],
    resolutions: [] as Record<string, string>[],
  };
  await page.route("**/api/backend/strategy/strategies", (route) =>
    json(route, [strategySummary]),
  );
  await page.route("**/core/engagement/outreach-v3/sessions?*", (route) =>
    json(route, [
      {
        ...session.session,
        topic: null,
        goal: null,
        targetCount: 0,
        recordStatus: null,
        sentAt: null,
      },
    ]),
  );
  await page.route(`**/core/clients/${clientId}/objectives**`, (route) => {
    const method = route.request().method();
    if (method === "GET") return json(route, [state.record]);
    const body = route.request().postDataJSON();
    state.writes.push({ method, body });
    if (method === "PATCH") {
      state.record = {
        ...state.record,
        ...body,
        version: state.record.version + 1,
      };
      return json(route, state.record);
    }
    return json(
      route,
      { message: "Synthetic review transition unavailable" },
      503,
    );
  });
  await page.route("**/objective-destination?*", (route) => {
    state.resolutions.push(
      Object.fromEntries(new URL(route.request().url()).searchParams),
    );
    return json(
      route,
      { message: "Synthetic current destination conflict" },
      409,
    );
  });
  await page.route(`**/core/clients/${nextObjectiveClient}`, (route) =>
    json(route, {
      ...client,
      id: nextObjectiveClient,
      name: "Other synthetic client",
    }),
  );
  await page.route(
    `**/core/clients/${nextObjectiveClient}/objectives`,
    (route) =>
      json(route, [
        {
          ...objective,
          id: nextObjectiveId,
          clientId: nextObjectiveClient,
          outcome: "Other client objective",
        },
      ]),
  );
  await page.route(
    `**/core/clients/${nextObjectiveClient}/advocacy-matters**`,
    (route) => json(route, []),
  );
  return { state, unexpected };
}

export function objectivePanels(page: Page) {
  const editor = page.getByRole("dialog", {
    name: "Edit objective",
    exact: true,
  });
  return {
    editor,
    outreach: editor.getByRole("region", {
      name: "Objective destinations",
      exact: true,
    }),
    work: editor.getByRole("region", {
      name: "Existing Objective work",
      exact: true,
    }),
  };
}
export async function chooseBothObjectiveDestinations(page: Page) {
  const { outreach, work } = objectivePanels(page);
  await outreach
    .getByRole("button", {
      name: "Choose existing Outreach session",
      exact: true,
    })
    .click();
  await outreach
    .getByLabel("Existing Outreach session", { exact: true })
    .selectOption(sessionId);
  await work
    .getByRole("button", { name: "Choose existing resources", exact: true })
    .click();
  await work
    .getByLabel("Resource type", { exact: true })
    .selectOption("strategy");
  await work
    .getByLabel("Existing Strategy", { exact: true })
    .selectOption(strategyId);
  await expect(
    outreach.getByRole("button", {
      name: "Open Objective-bound Outreach",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    work.getByRole("button", {
      name: "Open Objective-bound Strategy",
      exact: true,
    }),
  ).toBeEnabled();
}
export async function holdObjectiveResolutions(page: Page) {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state = { entered: 0, offered: 0 };
  await page.route("**/objective-destination?*", async (route) => {
    state.entered++;
    await waiting;
    try {
      await json(
        route,
        route.request().url().includes("/outreach-v3/")
          ? boundOutreach
          : boundStrategy,
      );
    } catch (error) {
      if (!route.request().failure()) throw error;
    } finally {
      state.offered++;
    }
  });
  return { state, release };
}
