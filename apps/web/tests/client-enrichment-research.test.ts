import "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { installPlatform, db, local } from "./command-recovery-platform";
import { researchRecovery } from "../src/features/portfolio/profile-build/research-recovery";
import {
  researchCommandSchema,
  matchesResearchScope,
  validateResearchSelection,
  canResearchFile,
} from "../src/features/portfolio/profile-build/research-contracts";
import { runSchema } from "../src/features/portfolio/profile-build/contracts";
import { initialResearchInput } from "../src/features/portfolio/profile-build/ResearchRequest";
import {
  prepareResearch,
  sendResearch,
} from "../src/features/portfolio/profile-build/research-api";
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
const journal = () =>
  researchRecovery({ kind: "client", id: clientId }, actor, guard);
const setup = {
  subject: { kind: "client" as const, id: clientId },
  clientId,
  clientName: "Client",
  website: "https://saved.example/",
  selectedIdentities: [],
  suggestedIdentities: [],
  taskPreview: [],
};
const run = {
  subject: { kind: "client" as const, id: clientId },
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
  setup: { website: input.website },
};

it("encrypts the exact research choices and separates clients and actors", async () => {
  await journal().reserve(command());
  expect(await journal().load()).toEqual({ command: command() });
  for (const records of [db.records, local])
    expect(JSON.stringify([...records.values()])).not.toContain(
      "private.example",
    );
  expect(
    await researchRecovery(
      { kind: "client", id: otherId },
      actor,
      guard,
    ).load(),
  ).toBeNull();
  expect(
    await researchRecovery(
      { kind: "client", id: clientId },
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
    sendResearch(
      api,
      { kind: "client", id: clientId },
      command(),
      guard,
      signal,
      journal().received,
    ),
  ).rejects.toThrow("Disconnected");
  await expect(journal().acknowledge(requestId)).rejects.toThrow(
    "exact saved run",
  );
  const saved = (await journal().load())!;
  if (!("input" in saved.command))
    throw new Error("Expected a saved research start");
  await sendResearch(
    api,
    { kind: "client", id: clientId },
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
        { kind: "client", id: clientId },
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
  const owner = researchRecovery(
    { kind: "client", id: clientId },
    actor,
    active,
  );
  await owner.reserve(command());
  const api = createApiClient(async () => {
    current = false;
    return Response.json(run);
  });
  await expect(
    sendResearch(
      api,
      { kind: "client", id: clientId },
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
      { kind: "client", id: clientId },
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

it("retains automatic LDA discovery through lost-response recovery and requires the matching run receipt", async () => {
  const automaticInput = {
    ...input,
    sources: ["public_web" as const, "sam_gov" as const, "lda" as const],
    discoverLda: true,
  };
  const prepared = await prepareResearch(
    createApiClient(async () => Response.json(setup)),
    { kind: "client", id: clientId },
    automaticInput,
    guard,
    new AbortController().signal,
  );
  const automaticCommand = { ...prepared, requestId };
  await journal().reserve(automaticCommand);
  const savedRun = {
    ...run,
    requestedSources: automaticInput.sources,
    selectedLdaIds: [],
    setup: { ...run.setup, discoverLda: true },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error("Disconnected"))
    .mockResolvedValueOnce(Response.json(savedRun));
  const send = (value: typeof automaticCommand) =>
    sendResearch(
      createApiClient(fetcher),
      { kind: "client", id: clientId },
      value,
      guard,
      new AbortController().signal,
      journal().received,
    );
  await expect(send(automaticCommand)).rejects.toThrow("Disconnected");
  const saved = (await journal().load())!;
  if (!("input" in saved.command)) throw new Error("Expected a research start");
  await send(saved.command);
  expect(
    fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body))),
  ).toEqual([
    { requestId, ...automaticInput },
    { requestId, ...automaticInput },
  ]);
  expect(
    matchesResearchScope(
      automaticInput,
      runSchema.parse({ ...savedRun, setup: run.setup }),
    ),
  ).toBe(false);
  const manual = initialResearchInput(setup, runSchema.parse(savedRun));
  expect(manual.discoverLda).toBeUndefined();
  expect(manual.ldaClientIds).toEqual([]);
  await journal().acknowledge(requestId);
});

it("only client LDA research may request automatic identity discovery", () => {
  const automatic = { ...input, sources: ["lda" as const], discoverLda: true };
  expect(validateResearchSelection(automatic, setup, [])).toEqual(automatic);
  expect(
    validateResearchSelection({ ...automatic, discoverLda: false }, setup, [])
      .discoverLda,
  ).toBe(false);
  expect(() =>
    validateResearchSelection(
      { ...automatic, sources: ["public_web"] },
      setup,
      [],
    ),
  ).toThrow("Automatic LDA discovery");
  expect(() =>
    validateResearchSelection({ ...automatic, ldaClientIds: [42] }, setup, []),
  ).toThrow("Automatic LDA discovery");
  expect(() =>
    validateResearchSelection(
      automatic,
      { ...setup, subject: { kind: "prospect", id: clientId } },
      [],
    ),
  ).toThrow("requires a client");
});
it("document selection requires a currently available file in the selected client", () => {
  const file = {
    id: otherId,
    clientId,
    usable: true,
    viewerMode: "all",
    lifecycleStatus: "ready",
    extractionStatus: "extracted",
  } as Attachment;
  expect(
    validateResearchSelection(
      { ...input, sources: [], attachmentIds: [otherId] },
      setup,
      [file],
    ).sources,
  ).toEqual([]);
  expect(
    canResearchFile(
      {
        ...file,
        lifecycleStatus: "legacy_ready",
        extractionStatus: "truncated",
      },
      { kind: "client", id: clientId },
    ),
  ).toBe(true);
  for (const changed of [
    { ...file, usable: false },
    { ...file, viewerMode: "restricted" as const },
    { ...file, lifecycleStatus: "available" },
    { ...file, clientId: otherId },
    { ...file, lifecycleStatus: "deleted" },
    { ...file, extractionStatus: "pending" },
  ]) {
    expect(canResearchFile(changed, { kind: "client", id: clientId })).toBe(
      false,
    );
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
      { kind: "client", id: clientId },
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

it("retains approved business unit scope in the exact durable request and excludes it from prospects", () => {
  const scoped = { ...input, businessUnitId: otherId };
  expect(
    researchCommandSchema.parse({ requestId, input: scoped }).input
      .businessUnitId,
  ).toBe(otherId);
  expect(
    validateResearchSelection(
      scoped,
      { ...setup, availableSources: ["public_web"] },
      [],
    ).businessUnitId,
  ).toBe(otherId);
  expect(() =>
    validateResearchSelection(
      scoped,
      {
        ...setup,
        subject: { kind: "prospect", id: clientId },
        clientId: null,
        prospectId: clientId,
      },
      [],
    ),
  ).toThrow("Business unit research requires a client");
});
