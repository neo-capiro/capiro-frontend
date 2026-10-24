import "./command-recovery-platform";
import { describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  newClientCommandRequest,
  newClientRecoveryContract,
  prepareNewClient,
  newClientRefusal,
  reviewNewClientRefusal,
} from "../src/features/portfolio/prospects/conversion/new-client-command";
import type { Prospect } from "../src/features/portfolio/prospects/contracts";
import {
  readRecovery,
  reserveRecovery,
  retireNewClientConversionRefusalRecovery,
} from "../src/shared/session/recovery/journal";
import { installPlatform } from "./command-recovery-platform";

installPlatform();
const record: Prospect = {
  id: "10000000-0000-4000-8000-000000000001",
  displayName: "Synthetic prospect",
  domain: null,
  website: null,
  description: null,
  serviceHypothesis: null,
  geography: null,
  ownerUserId: null,
  stage: "proposal",
  status: "active",
  nextAction: null,
  nextActionDueAt: null,
  linkedClientId: null,
  convertedAt: null,
  createdAt: "2026-10-24T12:00:00.000Z",
  updatedAt: "2026-10-24T12:00:00.000Z",
};
const requestId = "30000000-0000-4000-8000-000000000001";
const clientId = "20000000-0000-4000-8000-000000000001";
const prepare = () =>
  prepareNewClient(
    record,
    { website: "https://example.test", description: "" },
    requestId,
  );
const guard = () => {};
const refusalFor = (attempt: Awaited<ReturnType<typeof prepare>>) => ({
  schemaVersion: 1 as const,
  code: "PROSPECT_NEW_CLIENT_REFUSED" as const,
  requestId,
  prospectId: record.id,
  payloadDigest: attempt.payloadDigest,
  status: 409 as const,
  message: "Review changed prospect",
});

it.each([
  { requestId: clientId },
  { prospectId: clientId },
  { payloadDigest: "0".repeat(64) },
  { schemaVersion: 2 },
  { code: "GENERIC_CONFLICT" },
  { status: 400 },
])("does not bind a mismatched refusal %j", async (patch) => {
  const attempt = await prepare();
  expect(
    newClientRefusal(
      new ApiError(409, "Conflict", { ...refusalFor(attempt), ...patch }),
      attempt,
    ),
  ).toBeUndefined();
});
it("generic refusal and missing receipt alone cannot release conversion recovery", async () => {
  const attempt = await prepare();
  expect(
    newClientRefusal(new ApiError(409, "Conflict"), attempt),
  ).toBeUndefined();
  const f = await fixture({}, 404);
  await expect(
    reviewNewClientRefusal(f.api, attempt, new AbortController().signal, guard),
  ).rejects.toThrow("no verified refusal");
  expect(f.calls).toEqual([]);
});
it("a typed bound refusal survives reload and requires fresh receipt/prospect reads before explicit retirement", async () => {
  const attempt = await prepare();
  const saved = { ...attempt, refusal: refusalFor(attempt) };
  const scope = "new-client-refusal-test";
  await reserveRecovery(
    scope,
    requestId,
    saved,
    newClientRecoveryContract,
    guard,
  );
  const restored = await readRecovery(scope, newClientRecoveryContract, guard);
  expect(restored).toEqual(saved);
  const calls: string[] = [];
  const api = createApiClient(async (path, init) => {
    expect(init?.method).toBe("GET");
    calls.push(String(path));
    return String(path).includes("conversion-commands")
      ? Response.json({ message: "No saved receipt" }, { status: 404 })
      : Response.json({ ...record, updatedAt: "2026-10-24T13:00:00.000Z" });
  });
  const failure = await reviewNewClientRefusal(
    api,
    restored!,
    new AbortController().signal,
    guard,
  );
  expect(await readRecovery(scope, newClientRecoveryContract, guard)).toEqual(
    saved,
  );
  await retireNewClientConversionRefusalRecovery(
    scope,
    requestId,
    failure,
    guard,
  );
  expect(
    await readRecovery(scope, newClientRecoveryContract, guard),
  ).toBeNull();
  expect(calls).toEqual([
    `/api/backend/core/business-development/prospects/${record.id}/conversion-commands/${requestId}`,
    `/api/backend/core/business-development/prospects/${record.id}`,
  ]);
});
it("a later matching receipt prevents refusal retirement", async () => {
  const f = await fixture();
  await expect(
    reviewNewClientRefusal(
      f.api,
      { ...f.attempt, refusal: refusalFor(f.attempt) },
      new AbortController().signal,
      guard,
    ),
  ).rejects.toThrow("saved receipt");
  expect(f.calls).toHaveLength(1);
});
it.each([
  "unavailable-receipt",
  "foreign-receipt",
  "revoked-prospect",
  "converted-prospect",
])("fresh %s keeps typed refusal held", async (failure) => {
  const f = await fixture();
  const calls: string[] = [];
  const api = createApiClient(async (path) => {
    calls.push(String(path));
    if (String(path).includes("conversion-commands")) {
      if (failure === "unavailable-receipt")
        return Response.json({ message: "Unavailable" }, { status: 503 });
      if (failure === "foreign-receipt")
        return Response.json({ ...f.receipt, payloadDigest: "0".repeat(64) });
      return Response.json({ message: "No saved receipt" }, { status: 404 });
    }
    return failure === "revoked-prospect"
      ? Response.json({ message: "Revoked" }, { status: 403 })
      : Response.json({
          ...record,
          linkedClientId: clientId,
          convertedAt: record.updatedAt,
        });
  });
  await expect(
    reviewNewClientRefusal(
      api,
      { ...f.attempt, refusal: refusalFor(f.attempt) },
      new AbortController().signal,
      guard,
    ),
  ).rejects.toThrow();
  expect(calls.length).toBe(failure.endsWith("prospect") ? 2 : 1);
});
async function fixture(patch: object = {}, status = 200) {
  const attempt = await prepare();
  const receipt = {
    schemaVersion: 1,
    requestId,
    prospectId: record.id,
    clientId,
    payloadDigest: attempt.payloadDigest,
    outcome: "created",
    expectedUpdatedAt: record.updatedAt,
    prospectUpdatedAt: "2026-10-24T12:00:01.000Z",
    committedAt: "2026-10-24T12:00:01.000Z",
    ...patch,
  };
  const calls: { path: string; method: string; body: unknown }[] = [];
  const api = createApiClient(async (url, init) => {
    calls.push({
      path: String(url),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return Response.json(receipt, { status });
  });
  return { attempt, receipt, calls, api };
}
describe("reviewed new-client conversion", () => {
  it("matches the canonical Core serialization and never sends transfer fields", async () => {
    const f = await fixture();
    expect(f.attempt.payloadDigest).toBe(
      "40da1e94bbb35185d2a9abdfce3be181af63fbfb11dfb93ef580f361fbc105f8",
    );
    expect(
      await newClientCommandRequest(
        f.api,
        f.attempt,
        "create",
        new AbortController().signal,
        guard,
      ),
    ).toEqual(f.receipt);
    expect(f.calls).toEqual([
      {
        path: `/api/backend/core/business-development/prospects/${record.id}/conversion-commands`,
        method: "POST",
        body: f.attempt.command,
      },
    ]);
    expect(Object.keys(f.attempt.command)).toEqual([
      "schemaVersion",
      "requestId",
      "prospectId",
      "expectedUpdatedAt",
      "mode",
      "clientName",
      "clientWebsite",
      "clientDescription",
    ]);
  });
  it("reload retains the original request and recovery only reads its receipt", async () => {
    const f = await fixture();
    const scope = "synthetic-tenant:actor:prospect-conversion";
    await reserveRecovery(
      scope,
      requestId,
      f.attempt,
      newClientRecoveryContract,
      guard,
    );
    const restored = await readRecovery(
      scope,
      newClientRecoveryContract,
      guard,
    );
    expect(restored).toEqual(f.attempt);
    expect(
      await newClientCommandRequest(
        f.api,
        restored!,
        "recover",
        new AbortController().signal,
        guard,
      ),
    ).toEqual(f.receipt);
    expect(f.calls[0]).toEqual({
      path: `/api/backend/core/business-development/prospects/${record.id}/conversion-commands/${requestId}`,
      method: "GET",
      body: undefined,
    });
  });
  it.each([
    { outcome: "linked" },
    { requestId: clientId },
    { prospectId: clientId },
    { payloadDigest: "0".repeat(64) },
    { expectedUpdatedAt: "2026-10-24T12:00:02.000Z" },
  ])("refuses mismatched success", async (patch) => {
    const f = await fixture(patch);
    await expect(
      newClientCommandRequest(
        f.api,
        f.attempt,
        "create",
        new AbortController().signal,
        guard,
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(f.calls).toHaveLength(1);
  });
  it("a capacity refusal propagates and cannot be a success receipt", async () => {
    const f = await fixture({ message: "No remaining client capacity" }, 402);
    await expect(
      newClientCommandRequest(
        f.api,
        f.attempt,
        "create",
        new AbortController().signal,
        guard,
      ),
    ).rejects.toMatchObject({ status: 402 });
    expect(f.calls).toHaveLength(1);
  });
  it("current authority refusal prevents both dispatch and receipt publication", async () => {
    const f = await fixture();
    await expect(
      newClientCommandRequest(
        f.api,
        f.attempt,
        "create",
        new AbortController().signal,
        () => {
          throw new Error("Revoked");
        },
      ),
    ).rejects.toThrow("Revoked");
    expect(f.calls).toEqual([]);
  });
  it.each(["javascript:alert(1)", "https://name:secret@example.test"])(
    "rejects unsafe website %s",
    async (website) => {
      await expect(
        prepareNewClient(record, { website, description: "" }, requestId),
      ).rejects.toThrow();
    },
  );
});
