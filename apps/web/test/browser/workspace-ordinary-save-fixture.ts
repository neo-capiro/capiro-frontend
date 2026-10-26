import { expect, type Page, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId } from "./next-modules-fixtures";
import {
  ordinary,
  state,
  receipt,
  producerHash,
  scope,
} from "../../tests/workspace-ordinary-save-fixtures";
import type {
  OrdinarySaveBody,
  OrdinarySaveResponse,
} from "../../src/shared/capiro/operations/workspace-documents";

export const ordinaryEditorUrl = `/modules/workspace?draftId=${scope.draftId}`;
export async function ordinarySaveFixture(
  page: Page,
  options: {
    loseFirstResponse?: boolean;
    holdSave?: boolean;
    foreignReceipt?: boolean;
    heldClient?: boolean;
    holdAssociation?: boolean;
    refusalCode?: string;
    formatted?: boolean;
  } = {},
) {
  await onlyLocalRequests(page);
  let row = ordinary();
  if (options.heldClient) row.clientAssociation = "held";
  if (options.formatted)
    row.config.sectionContent.Body = "<p><strong>Saved rich body</strong></p>";
  let denied = false;
  let identity = structuredClone(testIdentity);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const saves: OrdinarySaveBody[] = [];
  const calls: { key: string; method: string }[] = [];
  const versions = new Map<
    string,
    { hash: string; response: OrdinarySaveResponse }
  >();
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "me.read": () => identity,
    "workspace.draft": () => row,
    "workspace.draft.versions": [],
    "workspace.clients": {
      items: [
        {
          id: client.id,
          name: client.name,
          mono: "CA",
          description: null,
          objectiveCount: 0,
          officeCount: 0,
          hasLogo: false,
        },
      ],
      nextCursor: null,
      sources: [],
    },
  });
  await page.route("**/api/capiro/workspace.draft.state?*", (route) =>
    denied
      ? route.fulfill({
          status: 404,
          json: { message: "Current access refused" },
        })
      : route.fulfill({ json: state(row) }),
  );
  const reply = async (route: Route, value: unknown, status = 200) => {
    try {
      await route.fulfill({ status, json: value });
    } catch {
      /* Disposed synthetic route. */
    }
  };
  await page.route("**/api/capiro/workspace.draft.update", async (route) => {
    const request = route.request().postDataJSON() as {
      body: { clientId: string };
    };
    if (
      request.body.clientId !== clientId ||
      Object.keys(request.body).length !== 1
    )
      return reply(route, row); // The atomic-save witness catches forbidden writes.
    if (options.holdAssociation) await held;
    row = {
      ...row,
      clientId,
      client: client.name,
      clientAssociation: undefined,
    };
    return reply(route, row);
  });
  await page.route("**/api/capiro/workspace.draft.save", async (route) => {
    const body = route.request().postDataJSON().body as OrdinarySaveBody;
    saves.push(structuredClone(body));
    if (options.refusalCode)
      return reply(route, { code: options.refusalCode }, 409);
    if (denied) return reply(route, { message: "Current access refused" }, 404);
    const prior = versions.get(body.requestId);
    if (prior)
      return reply(
        route,
        prior.hash === producerHash(body)
          ? { ...prior.response, replayed: true }
          : { code: "WORKSPACE_SAVE_REQUEST_CONFLICT" },
        prior.hash === producerHash(body) ? 200 : 409,
      );
    if (body.expectedStateHash !== state(row).stateHash)
      return reply(route, { code: "WORKSPACE_SAVE_STATE_CONFLICT" }, 409);
    if (body.expectedClientId !== row.clientId)
      return reply(route, { code: "WORKSPACE_SAVE_CLIENT_CONFLICT" }, 409);
    row = {
      ...row,
      docTitle: body.draft.docTitle,
      config: { ...row.config, ...body.draft.config },
      updatedAt: "2026-10-25T12:00:00.000Z",
    };
    const response = receipt(body, row);
    versions.set(body.requestId, { hash: producerHash(body), response });
    if (options.holdSave) await held;
    if (options.loseFirstResponse && saves.length === 1)
      return route.abort("failed");
    if (options.foreignReceipt)
      response.receipt.actorId = "synthetic-foreign-actor";
    return reply(route, response);
  });
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith("/api/capiro/"))
      calls.push({ key: pathname.split("/").pop()!, method: request.method() });
  });
  return {
    saves,
    calls,
    versions,
    release,
    initialStateHash: state(row).stateHash,
    current: () => row,
    changeSaved: (title: string, text = "Newer saved body") => {
      row = {
        ...row,
        docTitle: title,
        config: { ...row.config, sectionContent: { Body: text } },
      };
    },
    deny: () => {
      denied = true;
    },
    moveClient: () => {
      row = { ...row, clientId, client: client.name };
    },
    switchActor: async () => {
      identity = {
        ...testIdentity,
        user: {
          ...testIdentity.user,
          id: "10000000-0000-4000-8000-000000000099",
          clerkUserId: "other-test-user",
        },
      };
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: {
              userId: "other-test-user",
              sessionId: "other-test-session",
            },
          }),
        ),
      );
    },
  };
}
export async function openOrdinary(page: Page) {
  await page.goto(ordinaryEditorUrl);
  await expect(
    page.getByLabel("Document title", { exact: true }),
  ).toBeEditable();
}
export async function editOrdinary(page: Page, title = "Retained local title") {
  await page.getByLabel("Document title", { exact: true }).fill(title);
  await page
    .getByRole("textbox", { name: "Body content", exact: true })
    .fill("Retained local body");
}
