import type { Page, Route } from "@playwright/test";
import { onlyLocalRequests } from "../fixtures";
import { presentationFont } from "../ordinary-presentation-evidence";
import {
  deliveryRecord,
  preparedVersion,
  mailbox,
  recordId,
  sendReadback,
  intentId,
} from "../../../tests/newsletter-delivery-fixtures";
export const href = `/newsletter-delivery/index.html?view=outreach&newsletter=${recordId}`;
export function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
export async function fixture(page: Page, prepared = true) {
  await onlyLocalRequests(page);
  await presentationFont(page);
  const state = {
    record: deliveryRecord(prepared),
    mailboxes: [mailbox],
    result: undefined as ReturnType<typeof sendReadback> | undefined,
    loseAck: false,
    unavailable: false,
    revoked: false,
    hold: undefined as ReturnType<typeof barrier> | undefined,
    calls: [] as {
      key: string;
      method: string;
      input: {
        params?: Record<string, string>;
        body?: Record<string, unknown>;
      };
      retained: string | null;
    }[],
    unexpected: [] as string[],
  };
  const reply = (route: Route, json: unknown) => route.fulfill({ json });
  await page.route("**/api/backend/core/clients/*", (route) =>
    reply(route, {
      id: new URL(route.request().url()).pathname.split("/").at(-1),
      name: "Synthetic client",
      profileStatus: "complete",
      status: "active",
    }),
  );
  await page.route("**/api/capiro/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = decodeURIComponent(url.pathname.split("/").at(-1)!);
    const input =
      request.method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : request.postDataJSON();
    state.calls.push({
      key,
      method: request.method(),
      input,
      retained: new URL(page.url()).searchParams.get("newsletterSendRequest"),
    });
    if (key === "engagement.richNewsletter.record") {
      const current = structuredClone(state.record);
      if (state.hold) await state.hold.promise;
      return state.revoked
        ? route.fulfill({
            status: 403,
            json: { message: "Synthetic revoked access" },
          })
        : reply(route, current);
    }
    if (key === "engagement.richNewsletter.stage")
      return reply(route, state.record.stage);
    if (key === "engagement.richNewsletter.open")
      return reply(route, state.record);
    if (key === "engagement.newsletter.mailboxes")
      return reply(route, state.mailboxes);
    if (key === "directory.contacts")
      return reply(route, {
        contacts: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totals: { all: 0, house: 0, senate: 0, governors: 0, staff: 0 },
        availableStates: [],
        availableFilters: {
          chambers: [],
          parties: [],
          committees: [],
          issues: [],
          roles: [],
          states: [],
        },
      });
    if (key === "directory.state-legislators")
      return reply(route, { rows: [], total: 0 });
    if (key === "engagement.newsletter.clientPeople") return reply(route, []);
    if (key === "engagement.newsletter.prepare") {
      state.record.versions = [preparedVersion()];
      state.record.targets = input.body.targets;
      state.record.senderConnectionId = input.body.senderConnectionId;
      state.record.subject = input.body.subject;
      return reply(route, { versions: state.record.versions, excluded: [] });
    }
    if (
      key === "engagement.newsletter.send" ||
      key === "engagement.newsletter.test"
    ) {
      const testMode = key.endsWith(".test");
      state.result = sendReadback(testMode);
      state.result.requestKey = input.body.requestKey;
      state.result.intent!.requestKey = input.body.requestKey;
      if (!testMode) {
        const copies = state.record.targets[0]?.cc;
        state.result.intent!.deliveries[0]!.cc = Array.isArray(copies)
          ? copies.filter((email): email is string => typeof email === "string")
          : [];
      }
      if (testMode)
        state.record.tests.push({
          id: intentId,
          requestKey: input.body.requestKey,
          senderConnectionId: mailbox.id,
          versionId: input.body.versionIds[0],
        });
      else state.record.intentId = intentId;
      return state.loseAck
        ? route.fulfill({
            status: 503,
            json: { message: "Synthetic acknowledgement loss" },
          })
        : reply(route, { intentId, deduped: false });
    }
    if (
      key === "engagement.newsletter.sendRequest" ||
      key === "engagement.newsletter.sendStatus"
    ) {
      return state.unavailable
        ? route.fulfill({
            status: 503,
            json: { message: "Synthetic status unavailable" },
          })
        : reply(
            route,
            state.result ?? {
              outreachRecordId: recordId,
              requestKey: input.params.requestKey,
              intent: null,
            },
          );
    }
    state.unexpected.push(key);
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected fixture request" },
    });
  });
  return state;
}
