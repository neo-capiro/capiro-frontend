import "./command-recovery-platform";
import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  newClientCommandRequest,
  newClientRecoveryContract,
  prepareNewClient,
} from "../src/features/portfolio/prospects/conversion/new-client-command";
import type { Prospect } from "../src/features/portfolio/prospects/contracts";
import {
  readRecovery,
  reserveRecovery,
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
