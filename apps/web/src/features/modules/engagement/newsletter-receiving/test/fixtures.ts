import {
  createNewsletterLayout,
  defaultNewsletterConfig,
} from "@capiro/shared/newsletter";
import { type Page } from "@playwright/test";
import { onlyLocalRequests } from "../../../../../../test/browser/fixtures";

export const stageId = "b1000000-0000-4000-8000-000000000001";
export const recordId = "b1000000-0000-4000-8000-000000000002";
export const documentId = "b1000000-0000-7000-8000-000000000003";
export const clientId = "b1000000-0000-4000-8000-000000000004";
export const otherId = "b1000000-0000-4000-8000-000000000099";
export const stageHref = `/modules/engagement?newsletterStage=${stageId}`;
export function stage() {
  return {
    id: stageId,
    documentId,
    revision: 4,
    name: "Weekly policy briefing",
    design: createNewsletterLayout(1),
    config: {
      ...defaultNewsletterConfig(),
      clientId,
      subject: "Saved briefing",
    },
  };
}
export function record() {
  return {
    id: recordId,
    status: "draft",
    name: "Weekly policy briefing",
    stage: stage(),
    targets: [],
    senderConnectionId: null,
    subject: "Saved briefing",
    versions: [],
    intentId: null,
    excluded: [],
    tests: [],
  };
}
export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
export async function fixture(page: Page) {
  await onlyLocalRequests(page);
  const state = {
    stage: stage(),
    record: record(),
    refused: false,
    openFailure: false,
    openGate: undefined as ReturnType<typeof deferred> | undefined,
    readGate: undefined as ReturnType<typeof deferred> | undefined,
    requests: [] as { key: string; method: string; input: unknown }[],
    unexpected: [] as string[],
  };
  await page.route("**/api/backend/core/clients/*", async (route) =>
    route.fulfill({
      json: {
        id: new URL(route.request().url()).pathname.split("/").pop(),
        name: "Synthetic client",
        profileStatus: "complete",
        status: "active",
      },
    }),
  );
  await page.route("**/api/capiro/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = decodeURIComponent(url.pathname.split("/").pop()!);
    const input =
      request.method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : request.postDataJSON();
    state.requests.push({ key, method: request.method(), input });
    if (key === "engagement.richNewsletter.open") {
      if (state.openGate) await state.openGate.promise;
      if (state.openFailure)
        return route.fulfill({
          status: 503,
          json: { message: "Synthetic lost acknowledgement after commit" },
        });
      return route.fulfill({ json: state.record });
    }
    if (
      key === "engagement.richNewsletter.stage" ||
      key === "engagement.richNewsletter.record"
    ) {
      const snapshot = structuredClone(
        key.endsWith(".stage") ? state.stage : state.record,
      );
      if (state.readGate) await state.readGate.promise;
      return state.refused
        ? route.fulfill({
            status: 403,
            json: { message: "Synthetic current access refused" },
          })
        : route.fulfill({ json: snapshot });
    }
    state.unexpected.push(key);
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected operation" },
    });
  });
  return state;
}
