import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  receiveIntentsResponse,
  type IntentsItem,
} from "@capiro/meri-client/intents";
import { ConversationIntents } from "../src/features/meri/conversation/intents/ConversationIntents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { useConversationIntents } from "../src/features/meri/conversation/intents/useConversationIntents";
import { filingIntent, nativeTaskIntent } from "./meri-intents-native-fixtures";

// Exercise the public receiver, row projection and actual card renderer; only the
// asynchronous list hook is controlled. This is not browser/access acceptance.
vi.mock(
  "../src/features/meri/conversation/intents/useConversationIntents",
  () => ({
    useConversationIntents: vi.fn(),
  }),
);
const scope = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: "00000000-0000-4000-8000-000000000001",
};
const now = Date.parse("2026-10-12T20:00:00.000Z");
async function receive(fixture: ReturnType<typeof filingIntent>) {
  const response = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify(fixture.response),
    { request: fixture.request },
  );
  if ("error" in response) throw Error("Unexpected refusal");
  return response.intents;
}
function render(items: readonly IntentsItem[], unavailable = false) {
  const access = { list: vi.fn(), decide: vi.fn() };
  const state: ReturnType<typeof useConversationIntents> = {
    list: unavailable
      ? { status: "unavailable" }
      : { status: "ready", items, next: null, loadingMore: false },
    rows: intentRows(items, now, scope),
    attempts: {},
    oneTimeResults: [],
    dismissOneTime: vi.fn(),
    refresh: vi.fn(),
    retry: vi.fn(),
    loadMore: vi.fn(),
    decide: vi.fn(),
    decisionsReady: true,
    recoveryError: undefined,
  };
  vi.mocked(useConversationIntents).mockReturnValue(state);
  const html = renderToStaticMarkup(
    createElement(ConversationIntents, { access, scope }),
  );
  expect(access.list).not.toHaveBeenCalled();
  expect(access.decide).not.toHaveBeenCalled();
  expect(state.decide).not.toHaveBeenCalled();
  expect(state.refresh).not.toHaveBeenCalled();
  return html;
}
const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

it("links each saved attachment through its retained client, keeping artifact IDs and receipt URLs out of destinations", async () => {
  const fixture = filingIntent(["saved", "saved"]);
  const item = fixture.response.intents[0];
  const [first, second] = item.execution.outcome.result.files;
  first.location = "https://storage.invalid/receipt-only";
  first.reason = "Original saved; text extraction was partial.";
  second.indexingStatus = "indexed";
  second.reused = true;
  const html = render(await receive(fixture));
  expect(hrefs(html)).toEqual(
    [first, second].map(
      (file) =>
        `/portfolio/${item.proposal.command.arguments.clientId}/files?file=${file.documentId}`,
    ),
  );
  expect(html).toContain("Open saved-1.txt in Client Files");
  expect(html).toContain("Open saved-2.txt in Client Files");
  expect(html).toContain(first.reason);
  expect(html).toContain("Pending");
  expect(html).toContain("Indexed");
  expect(html).toContain("File 2 reused");
  expect(html).toContain("Yes");
  expect(html).toContain(first.location); // The original receipt stays visible as text.
  expect(
    hrefs(html).some((href) => href?.includes(first.object.objectId)),
  ).toBe(false);
});

it("mixed completion links only saved files while retaining pending and persisted-failed receipts", async () => {
  const fixture = filingIntent();
  const item = fixture.response.intents[0];
  const [saved, pending, failed] = item.execution.outcome.result.files;
  Object.assign(failed, {
    documentId: "00000000-0000-4000-8000-000000000999",
    location: "/stored-but-unavailable",
    indexingStatus: "not_indexed",
    reused: false,
  });
  const html = render(await receive(fixture));
  expect(hrefs(html)).toEqual([
    `/portfolio/${item.proposal.command.arguments.clientId}/files?file=${saved.documentId}`,
  ]);
  expect(html).toContain("1 saved, 1 pending, 1 failed");
  expect(html).toContain(pending.reason);
  expect(html).toContain(failed.reason);
  expect(html).toContain(failed.documentId);
});

it.each(["pending", "failed"] as const)(
  "a %s filing has no saved-file link",
  async (status) => {
    expect(hrefs(render(await receive(filingIntent([status]))))).toEqual([]);
  },
);

it.each(["approved", "executing", "unknown", "unavailable"])(
  "%s execution never fabricates a completion destination",
  async (state) => {
    const fixture = filingIntent(["saved"]);
    const item = fixture.response.intents[0];
    item.phase = state === "unavailable" ? "approved" : state;
    item.execution =
      state === "executing" || state === "unknown"
        ? { state }
        : state === "unavailable"
          ? "unavailable"
          : null;
    expect(hrefs(render(await receive(fixture)))).toEqual([]);
  },
);

it("the receiver refuses a phase-only completion without a correlated outcome", async () => {
  const fixture = filingIntent(["saved"]);
  fixture.response.intents[0].execution = null;
  await expect(receive(fixture)).rejects.toThrow();
});

it("withheld or unavailable current lists expose no saved-file destination", async () => {
  const fixture = filingIntent(["saved"]);
  const current = await receive(fixture);
  expect(hrefs(render(current, true))).toEqual([]);
  const item = fixture.response.intents[0];
  fixture.response.intents = [
    {
      deliveryId: item.deliveryId,
      createdAt: item.createdAt,
      operation: item.operation,
      state: "prepared",
      kind: "proposal",
      withheld: true,
    },
  ];
  const html = render(await receive(fixture));
  expect(html).toContain("Withheld");
  expect(hrefs(html)).toEqual([]);
});

it.each(["object", "document", "client", "filename"])(
  "the existing receiver refuses mismatched %s identity before display",
  async (changed) => {
    const fixture = filingIntent(["saved"]);
    const item = fixture.response.intents[0];
    const file = item.execution.outcome.result.files[0];
    if (changed === "object")
      file.object = { ...file.object, versionId: "another-version" };
    else if (changed === "document") delete file.documentId;
    else if (changed === "filename") file.fileName = null;
    else
      item.proposal.command.arguments.clientId =
        "00000000-0000-4000-8000-000000000099";
    await expect(receive(fixture)).rejects.toThrow();
  },
);

it("native task completion retains its Workspace link without becoming a file destination", async () => {
  const html = render(await receive(nativeTaskIntent()));
  expect(html).toContain("Open task in Workspace");
  expect(hrefs(html)).toHaveLength(1);
  expect(hrefs(html)[0]).not.toContain("/files?");
});
