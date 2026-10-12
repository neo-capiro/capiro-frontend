import type { Page, Route } from "@playwright/test";
import type {
  StrategyDetail,
  WorkspaceDraft,
} from "@/features/portfolio/work/contracts";
import { client, clientId, installFixtures, json } from "./fixtures";

export const otherClientId = "10000000-0000-4000-8000-000000000002";
export const firstStrategyId = "93000000-0000-4000-8000-000000000001";
export const secondStrategyId = "93000000-0000-4000-8000-000000000002";
export const firstNodeId = "93100000-0000-4000-8000-000000000001";
export const riskId = "93100000-0000-4000-8000-000000000002";
export const secondNodeId = "93100000-0000-4000-8000-000000000003";
export const firstStrategy: StrategyDetail = {
  id: firstStrategyId,
  clientId,
  title: "Synthetic current strategy",
  type: "policy",
  goal: "Synthetic first goal",
  targetDate: "2026-11-10T00:00:00Z",
  ownerUserId: "synthetic-owner",
  draftedByMeri: false,
  nodes: [
    {
      id: firstNodeId,
      title: "Synthetic first upcoming step",
      kind: "task",
      status: "active",
      startsOn: "2026-10-12T00:00:00Z",
      endsOn: null,
      openEnded: false,
      ownerUserId: null,
      note: null,
    },
    {
      id: riskId,
      title: "Synthetic current risk",
      kind: "risk",
      status: "draft",
      startsOn: "2026-10-10T00:00:00Z",
      endsOn: null,
      openEnded: true,
      ownerUserId: null,
      note: "Synthetic risk note",
    },
  ],
  artifacts: [
    { id: "93200000-0000-4000-8000-000000000001" },
    { id: "93200000-0000-4000-8000-000000000002" },
  ],
};
export const secondStrategy: StrategyDetail = {
  ...firstStrategy,
  id: secondStrategyId,
  title: "Synthetic independent strategy",
  goal: "Synthetic independent goal",
  nodes: [
    {
      ...firstStrategy.nodes[0]!,
      id: secondNodeId,
      title: "Synthetic independent upcoming step",
      status: "in_progress",
      startsOn: "2026-10-13T00:00:00Z",
    },
  ],
  artifacts: [{ id: "93200000-0000-4000-8000-000000000003" }],
};
export const workDrafts: WorkspaceDraft[] = [
  {
    id: "94000000-0000-4000-8000-000000000001",
    docTitle: "Synthetic current briefing draft",
    client: client.name,
    product: "Briefing",
    ownerId: "synthetic-owner",
    status: "draft",
    updatedAt: "2026-10-10T12:00:00Z",
  },
  {
    id: "94000000-0000-4000-8000-000000000002",
    docTitle: "Synthetic completed work letter",
    client: client.name,
    product: "Letter",
    ownerId: "synthetic-owner",
    status: "complete",
    updatedAt: "2026-10-09T12:00:00Z",
  },
];

export async function installWorkFixtures(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    summaries: [firstStrategy, secondStrategy].map((strategy) => ({
      ...strategy,
      nodeCount: strategy.nodes.length,
    })),
    details: {
      [firstStrategyId]: firstStrategy,
      [secondStrategyId]: secondStrategy,
    } as Record<string, StrategyDetail>,
    drafts: workDrafts,
    client,
    clients: [client],
    statuses: {
      summaries: 200,
      first: 200,
      second: 200,
      documents: 200,
      client: 200,
      clients: 200,
    },
  };
  const requests: string[] = [];
  function respond(route: Route, status: number, body: unknown) {
    const request = route.request();
    requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    if (request.method() !== "GET") {
      unexpected.push(`${request.method()} ${request.url()}`);
      return json(
        route,
        { message: "Unexpected synthetic Work mutation" },
        500,
      );
    }
    return json(
      route,
      status === 200 ? body : { message: "Synthetic Work source unavailable" },
      status,
    );
  }
  await page.route("**/strategy/strategies", (route) =>
    respond(route, state.statuses.summaries, state.summaries),
  );
  await page.route(`**/strategy/strategies/${firstStrategyId}`, (route) =>
    respond(route, state.statuses.first, state.details[firstStrategyId]),
  );
  await page.route(`**/strategy/strategies/${secondStrategyId}`, (route) =>
    respond(route, state.statuses.second, state.details[secondStrategyId]),
  );
  await page.route("**/workspace/drafts?scope=all", (route) =>
    respond(route, state.statuses.documents, { drafts: state.drafts }),
  );
  await page.route(`**/core/clients/${clientId}`, (route) =>
    respond(route, state.statuses.client, state.client),
  );
  await page.route("**/core/clients", (route) =>
    respond(route, state.statuses.clients, state.clients),
  );
  return { state, unexpected, requests };
}
