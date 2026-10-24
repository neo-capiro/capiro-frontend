import { expect, it } from "vitest";
import { z } from "zod";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  memberNoteRefusal,
  prepareMemberNote,
} from "../src/features/portfolio/relationships/member-notes/command";
import {
  newClientRefusal,
  prepareNewClient,
} from "../src/features/portfolio/prospects/conversion/new-client-command";
import { prospectSchema } from "../src/features/portfolio/prospects/contracts";

const id = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const config = readConfig({
  CORE_API_BASE_URL: "https://core.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
});
const note = {
  path: ["directory", "members", "member-42", "note-commands"],
  body: {
    schemaVersion: 1,
    requestId: id,
    kind: "note",
    directoryContactName: "Synthetic member",
    body: "Synthetic private note",
  },
  failure: {
    schemaVersion: 1,
    requestId: id,
    code: "DIRECTORY_NOTE_REFUSED",
    memberId: "member-42",
    payloadDigest: "a".repeat(64),
    status: 409,
    message: "Member changed",
  },
};
const conversion = {
  path: ["business-development", "prospects", other, "conversion-commands"],
  body: {
    schemaVersion: 1 as const,
    requestId: id,
    prospectId: other,
    expectedUpdatedAt: "2026-10-24T12:00:00.000Z",
    mode: "new_client" as const,
    clientName: "Synthetic prospect",
    clientWebsite: null,
    clientDescription: null,
  },
  failure: {
    schemaVersion: 1,
    requestId: id,
    code: "PROSPECT_NEW_CLIENT_REFUSED",
    prospectId: other,
    payloadDigest: "b".repeat(64),
    status: 402,
    message: "Capacity changed",
  },
};
const undo = {
  path: ["clients", other, "activity-commands", id, "undo"],
  body: {
    schemaVersion: 1,
    requestId: id,
    activityId: other,
    expectedRevision: "2026-10-24T12:00:00.123456Z",
  },
  failure: {
    schemaVersion: 1,
    requestId: id,
    code: "ACTIVITY_UNDO_REFUSED",
    commandId: id,
    creationRequestId: id,
    tenantId: other,
    clientId: other,
    actorUserId: id,
    activityId: other,
    payloadDigest: "c".repeat(64),
    status: 409,
    message: "This Undo removed no activity.",
  },
};
type Scenario = {
  path: string[];
  body: unknown;
  failure: { status: number; [key: string]: unknown };
};
async function relay(
  value: Scenario,
  options: {
    method?: string;
    path?: string[];
    body?: string;
    service?: string;
    status?: number;
    failure?: unknown;
  } = {},
) {
  const method = options.method ?? "POST";
  return proxyRequest(
    new Request("http://localhost:5188/api/backend/core/synthetic", {
      method,
      headers: {
        origin: "http://localhost:5188",
        "Content-Type": "application/json",
      },
      ...(method !== "GET"
        ? { body: options.body ?? JSON.stringify(value.body) }
        : {}),
    }),
    options.service ?? "core",
    options.path ?? value.path,
    config,
    async () => "synthetic-token",
    async () =>
      Response.json(options.failure ?? value.failure, {
        status: options.status ?? value.failure.status,
        headers: {
          "set-cookie": "synthetic=private",
          "x-provider-secret": "synthetic-secret",
        },
      }),
  );
}
it.each([note, conversion, undo])(
  "relays only the exact bounded refusal and no upstream headers",
  async (value) => {
    const response = await relay(value);
    expect(response.status).toBe(value.failure.status);
    expect(await response.json()).toEqual(value.failure);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-provider-secret")).toBeNull();
  },
);
it.each([
  { schemaVersion: 2 },
  { requestId: other },
  { payloadDigest: "malformed" },
  { code: "GENERIC_REFUSAL" },
  { status: 400 },
  { message: "x".repeat(2001) },
  { diagnostics: { private: "synthetic internal detail" } },
])("sanitizes malformed, foreign or expanded envelopes %j", async (patch) => {
  for (const value of [note, conversion, undo]) {
    const response = await relay(value, {
      failure: { ...value.failure, ...patch },
    });
    expect(await response.json()).toEqual({ message: expect.any(String) });
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
it.each([
  { method: "GET" },
  { method: "PATCH" },
  { path: ["clients", id, "people"] },
  { body: "not JSON" },
  { body: JSON.stringify({ requestId: id }) },
  {
    body: JSON.stringify({
      schemaVersion: 1,
      requestId: other,
      mode: "new_client",
      kind: "note",
      prospectId: other,
    }),
  },
  { status: 500 },
])(
  "keeps unrelated request/method/status boundaries sanitized %j",
  async (options) => {
    for (const value of [note, conversion, undo])
      expect(await (await relay(value, options)).json()).toEqual({
        message: expect.any(String),
      });
  },
);
it("requires the exact Directory target/kind and conversion target/new-client mode", async () => {
  for (const options of [
    { path: ["directory", "members", "member-43", "note-commands"] },
    { path: [...note.path, id] },
    { body: JSON.stringify({ ...note.body, kind: "call" }) },
  ])
    expect(await (await relay(note, options)).json()).toEqual({
      message: expect.any(String),
    });
  for (const options of [
    { path: ["business-development", "prospects", id, "conversion-commands"] },
    { path: [...conversion.path, id] },
    { body: JSON.stringify({ ...conversion.body, prospectId: id }) },
    { body: JSON.stringify({ ...conversion.body, mode: "existing_client" }) },
  ])
    expect(await (await relay(conversion, options)).json()).toEqual({
      message: expect.any(String),
    });
});
it("binds Undo refusal transport to the original client, creation request and activity", async () => {
  for (const options of [
    { path: ["clients", id, "activity-commands", id, "undo"] },
    { path: ["clients", other, "activity-commands", other, "undo"] },
    { path: [...undo.path, id] },
    { path: ["clients", other, "activity-commands", id] },
    { body: JSON.stringify({ ...undo.body, activityId: id }) },
    { status: 403, failure: { ...undo.failure, status: 403 } },
  ])
    expect(await (await relay(undo, options)).json()).toEqual({
      message: expect.any(String),
    });
});
it.each([400, 404, 409])(
  "preserves the finite Directory and conversion status%s",
  async (status) => {
    for (const value of [note, conversion])
      expect(
        await (
          await relay(value, { status, failure: { ...value.failure, status } })
        ).json(),
      ).toEqual({ ...value.failure, status });
  },
);
it("does not authorize an additional service or propagate an untyped upstream body", async () => {
  expect(await (await relay(note, { service: "strategy" })).json()).toEqual({
    message: expect.any(String),
  });
  expect(
    await (
      await relay(conversion, {
        failure: { message: "Generic conflict", clientId: other },
      })
    ).json(),
  ).toEqual({ message: "Generic conflict" });
});
it("does not promote authority failures or a Directory capacity status into a refusal proof", async () => {
  for (const value of [note, conversion]) {
    const response = await relay(value, {
      status: 403,
      failure: { ...value.failure, status: 403 },
    });
    expect(await response.json()).toEqual({ message: expect.any(String) });
  }
  const response = await relay(note, {
    status: 402,
    failure: { ...note.failure, status: 402 },
  });
  expect(await response.json()).toEqual({ message: expect.any(String) });
});
async function apiFailure(value: Scenario) {
  const api = createApiClient(async () => relay(value));
  try {
    await api.request("core", value.path.join("/"), z.unknown(), {
      method: "POST",
      body: value.body,
    });
  } catch (error) {
    return error;
  }
  throw new Error("Expected upstream refusal");
}
it("the actual proxy and ApiClient preserve a Directory proof only for its retained actor/payload digest", async () => {
  const attempt = await prepareMemberNote(
    { tenantId: id, userId: other },
    { id: "member-42", name: "Synthetic member" },
    "Synthetic private note",
    id,
  );
  const value = {
    ...note,
    body: attempt.input,
    failure: { ...note.failure, payloadDigest: attempt.payloadDigest },
  };
  const failure = await apiFailure(value);
  expect(failure).toBeInstanceOf(ApiError);
  expect(memberNoteRefusal(failure, attempt)).toEqual(value.failure);
  expect(
    memberNoteRefusal(failure, { ...attempt, payloadDigest: "c".repeat(64) }),
  ).toBeUndefined();
});
it("the actual proxy and ApiClient preserve the new-client proof without treating a different retained digest as refused", async () => {
  const record = prospectSchema.parse({
    id: other,
    displayName: conversion.body.clientName,
    updatedAt: conversion.body.expectedUpdatedAt,
    createdAt: conversion.body.expectedUpdatedAt,
    domain: null,
    website: null,
    description: null,
    serviceHypothesis: null,
    geography: null,
    ownerUserId: null,
    stage: "identified",
    status: "active",
    nextAction: null,
    nextActionDueAt: null,
    linkedClientId: null,
    convertedAt: null,
  });
  const attempt = await prepareNewClient(
    record,
    { website: "", description: "" },
    id,
  );
  const value = {
    ...conversion,
    body: attempt.command,
    failure: { ...conversion.failure, payloadDigest: attempt.payloadDigest },
  };
  const failure = await apiFailure(value);
  expect(newClientRefusal(failure, attempt)).toEqual(value.failure);
  const changed = await prepareNewClient(
    record,
    { website: "", description: "Different reviewed input" },
    id,
  );
  expect(newClientRefusal(failure, changed)).toBeUndefined();
});
