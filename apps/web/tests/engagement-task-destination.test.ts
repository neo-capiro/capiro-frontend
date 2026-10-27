import { expect, it } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { readFileSync } from "node:fs";
import { nativeTaskIntent } from "./meri-intents-native-fixtures";
import { intentRow } from "../src/features/meri/conversation/intents/intent-view";
import { workspaceTaskHref } from "../src/features/modules/workspace/task-destination-public";
import {
  engagementTask,
  engagementTaskOperations,
} from "../src/shared/capiro/operations/engagement-tasks";
import {
  readWorkspaceRoute,
  workspaceHref,
} from "../src/features/modules/workspace/workspace-route";

const id = "10000000-0000-4000-8000-000000000001";
const clientId = "10000000-0000-4000-8000-000000000002";
const wire = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/meri-intents/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const context = wire("context");

it.each([undefined, clientId])(
  "round trips an exclusive Workspace task destination with client %s",
  (client) => {
    const href = workspaceHref({ kind: "task", taskId: id, clientId: client });
    expect(workspaceTaskHref({ id, clientId: client ?? null })).toBe(href);
    expect(href.startsWith("/modules/workspace?")).toBe(true);
    expect(readWorkspaceRoute(new URLSearchParams(href.split("?")[1]))).toEqual(
      { kind: "task", taskId: id, clientId: client },
    );
  },
);
it.each([
  `taskId=bad`,
  `taskId=${id}&taskId=${id}`,
  `taskId=${id}&draftId=${id}`,
  `taskId=${id}&prospectId=${id}`,
  `taskId=${id}&hilldayId=${id}`,
  `taskId=${id}&newsletterId=${id}`,
  `taskId=${id}&briefSource=client`,
  `taskId=${id}&copyDocumentId=${id}`,
  `taskId=${id}&view=shares`,
  `taskId=${id}&hilldayPhase=generate`,
  `taskId=${id}&clientId=bad`,
])("refuses conflicting/invalid task link %s", (query) => {
  expect(readWorkspaceRoute(new URLSearchParams(query))).toEqual({
    kind: "invalid",
  });
});
it("registers one closed Core read and validates its exact client projection", () => {
  const operation = engagementTaskOperations["engagement.task"];
  expect(operation).toMatchObject({
    service: "core",
    method: "GET",
    path: "/engagement/tasks/:id",
  });
  expect(
    operation.request.safeParse({ params: { id }, query: { clientId } })
      .success,
  ).toBe(true);
  expect(
    operation.request.safeParse({ params: { id }, body: { action: "execute" } })
      .success,
  ).toBe(false);
  const row = {
    id,
    clientId,
    client: { id: clientId, name: "Synthetic" },
    title: "Current task",
    status: "done",
    dueDate: null,
    updatedAt: "2026-10-26T00:00:00.000Z",
  };
  expect(engagementTask.parse(row)).toEqual(row);
  expect(
    engagementTask.safeParse({ ...row, client: { ...row.client, id } }).success,
  ).toBe(false);
  expect(
    engagementTask.safeParse({ ...row, sourceId: "private" }).success,
  ).toBe(false);
});
it.each([false, true])(
  "projects only the public-received native task result (update=%s)",
  async (update) => {
    const fixture = nativeTaskIntent(update);
    const page = await receiveIntentsResponse(
      "list",
      200,
      JSON.stringify(fixture.response),
      { request: fixture.request },
    );
    if ("error" in page) throw Error("fixture refused");
    const result = fixture.response.intents[0].execution.outcome.result;
    expect(
      intentRow(page.intents[0]!, context.syntheticNow, context).task,
    ).toEqual({ id: result.id, clientId: result.clientId });
  },
);
it.each(["listCompleted", "listAwaiting"])(
  "does not infer EngagementTask from legacy/pending %s",
  async (name) => {
    const fixture = wire(name);
    const page = await receiveIntentsResponse(
      "list",
      200,
      JSON.stringify(fixture.response),
      { request: fixture.request },
    );
    if ("error" in page) throw Error("fixture refused");
    for (const item of page.intents)
      expect(
        intentRow(item, context.syntheticNow, context).task,
      ).toBeUndefined();
  },
);
it("does not link an unknown preparation", async () => {
  const fixture = nativeTaskIntent();
  const { deliveryId, createdAt, operation } = fixture.response.intents[0];
  fixture.response.intents = [
    { deliveryId, createdAt, operation, state: "unknown" },
  ];
  const page = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify(fixture.response),
    { request: fixture.request },
  );
  if ("error" in page) throw Error("fixture refused");
  expect(
    intentRow(page.intents[0]!, context.syntheticNow, context).task,
  ).toBeUndefined();
});
