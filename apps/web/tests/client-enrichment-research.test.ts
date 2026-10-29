import "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { installPlatform, db, local } from "./command-recovery-platform";
import { researchRecovery } from "../src/features/portfolio/client-profile/enrichment/research-recovery";
import {
  researchCommandSchema,
  validateResearchSelection,
  canResearchFile,
} from "../src/features/portfolio/client-profile/enrichment/research-contracts";
import {
  prepareResearch,
  sendResearch,
} from "../src/features/portfolio/client-profile/enrichment/research-api";
import { createApiClient } from "../src/shared/portfolio/api/http";
import type { Attachment } from "../src/features/portfolio/files/public";
installPlatform();
const clientId = "10000000-0000-4000-8000-000000000001";
const requestId = "10000000-0000-4000-8000-000000000002";
const otherId = "10000000-0000-4000-8000-000000000003";
const actor = { tenantId: "tenant-a", userId: "user-a" };
const guard = () => {};
const input = {
  sources: ["public_web" as const],
  website: "https://private.example/",
  attachmentIds: [],
  ldaClientIds: [],
};
const command = () => researchCommandSchema.parse({ requestId, input });
const journal = () => researchRecovery(clientId, actor, guard);
const setup = {
  clientId,
  clientName: "Client",
  website: "https://saved.example/",
  selectedIdentities: [],
  suggestedIdentities: [],
  taskPreview: [],
};
const run = {
  id: requestId,
  clientId,
  status: "running",
  requestedSources: ["public_web"],
  sourceStates: {},
  summary: {},
  error: null,
  startedAt: "2026-10-29T10:00:00Z",
  completedAt: null,
  findings: [],
};

it("encrypts the exact research choices and separates clients and actors", async () => {
  await journal().reserve(command());
  expect(await journal().load()).toEqual({ command: command() });
  for (const records of [db.records, local])
    expect(JSON.stringify([...records.values()])).not.toContain(
      "private.example",
    );
  expect(await researchRecovery(otherId, actor, guard).load()).toBeNull();
  expect(
    await researchRecovery(
      clientId,
      { ...actor, userId: "other" },
      guard,
    ).load(),
  ).toBeNull();
});
it("two tabs cannot replace an unresolved start with new choices", async () => {
  const results = await Promise.allSettled(
    [command(), { ...command(), requestId: otherId }].map((value) =>
      journal().lock(() => journal().reserve(value)),
    ),
  );
  expect(results.map((value) => value.status)).toEqual([
    "fulfilled",
    "rejected",
  ]);
  expect((await journal().load())?.command).toEqual(command());
});
it("a lost response retains the request and recovery repeats only the original UUID and body", async () => {
  await journal().reserve(command());
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error("Disconnected"))
    .mockResolvedValueOnce(Response.json(run));
  const api = createApiClient(fetcher),
    signal = new AbortController().signal;
  await expect(
    sendResearch(api, clientId, command(), guard, signal, journal().received),
  ).rejects.toThrow("Disconnected");
  await expect(journal().acknowledge(requestId)).rejects.toThrow(
    "exact saved run",
  );
  const saved = (await journal().load())!;
  if (!("input" in saved.command)) throw new Error("Expected a saved research start");
  await sendResearch(
    api,
    clientId,
    saved.command,
    guard,
    signal,
    journal().received,
  );
  expect(
    fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body))),
  ).toEqual([
    { requestId, ...input },
    { requestId, ...input },
  ]);
  expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
    fetcher.mock.calls[1]?.[1]?.body,
  );
  await journal().acknowledge(requestId);
  expect(await journal().load()).toBeNull();
});
it.each([
  { ...run, id: otherId },
  { ...run, clientId: otherId },
])(
  "a mismatched run cannot acknowledge the original request",
  async (wrong) => {
    await journal().reserve(command());
    await expect(
      sendResearch(
        createApiClient(async () => Response.json(wrong)),
        clientId,
        command(),
        guard,
        new AbortController().signal,
        journal().received,
      ),
    ).rejects.toThrow("unexpected response");
    expect((await journal().load())?.confirmed).toBeUndefined();
  },
);
it("a validated late result stays in its original scope without granting display access", async () => {
  let current = true;
  const active = () => {
    if (!current) throw Error("Session changed");
  };
  const owner = researchRecovery(clientId, actor, active);
  await owner.reserve(command());
  const api = createApiClient(async () => {
    current = false;
    return Response.json(run);
  });
  await expect(
    sendResearch(
      api,
      clientId,
      command(),
      active,
      new AbortController().signal,
      owner.received,
    ),
  ).rejects.toThrow("Session changed");
  expect((await journal().load())?.confirmed).toBe(true);
});
it("preflight refuses changed identity choices before reserving or posting", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(setup));
  await expect(
    prepareResearch(
      createApiClient(fetcher),
      clientId,
      { ...input, ldaClientIds: [42] },
      guard,
      new AbortController().signal,
    ),
  ).rejects.toThrow("no longer offered");
  expect(fetcher.mock.calls.every((call) => call[1]?.method === "GET")).toBe(
    true,
  );
  expect(await journal().load()).toBeNull();
});
it("document selection requires a currently available file in the selected client", () => {
  const file = {
    id: otherId,
    clientId,
    usable: true,
    lifecycleStatus: "available",
    extractionStatus: "extracted",
  } as Attachment;
  expect(
    validateResearchSelection(
      { ...input, sources: [], attachmentIds: [otherId] },
      setup,
      [file],
    ).sources,
  ).toEqual([]);
  for (const changed of [
    { ...file, usable: false },
    { ...file, clientId: otherId },
    { ...file, lifecycleStatus: "deleted" },
    { ...file, extractionStatus: "pending" },
  ]) {
    expect(canResearchFile(changed, clientId)).toBe(false);
    expect(() =>
      validateResearchSelection({ ...input, attachmentIds: [otherId] }, setup, [
        changed,
      ]),
    ).toThrow("no longer ready");
  }
});
it("missing recovery storage or access cannot dispatch a replacement start", async () => {
  db.failWrite = true;
  await expect(journal().reserve(command())).rejects.toThrow();
  db.failWrite = false;
  await expect(journal().load()).rejects.toThrow();
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    sendResearch(
      createApiClient(fetcher),
      clientId,
      command(),
      () => {
        throw Error("Revoked");
      },
      new AbortController().signal,
      journal().received,
    ),
  ).rejects.toThrow("Revoked");
  expect(fetcher).not.toHaveBeenCalled();
});
