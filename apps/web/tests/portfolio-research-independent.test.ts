import { beforeEach, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  prepareResearch,
  sendResearch,
} from "../src/features/portfolio/profile-build/research-api";
import { researchOperations } from "../src/features/portfolio/profile-build/research-operations";
import { researchCommandSchema } from "../src/features/portfolio/profile-build/research-contracts";
const h = vi.hoisted(() => ({
  load: vi.fn(),
  acknowledge: vi.fn(),
  received: vi.fn(),
  lock: vi.fn((fn: () => unknown) => fn()),
}));
vi.mock("../src/features/portfolio/profile-build/research-recovery", () => ({
  researchRecovery: () => h,
}));
const id = "10000000-0000-4000-8000-000000000001",
  capability = "10000000-0000-4000-8000-000000000002",
  doc = "10000000-0000-4000-8000-000000000003",
  requestId = "10000000-0000-4000-8000-000000000004";
const subject = { kind: "client" as const, id };
const input = {
  purpose: "alignment" as const,
  capabilityId: capability,
  sources: [] as "public_web"[],
  attachmentIds: [doc],
  ldaClientIds: [],
  website: "",
};
const command = researchCommandSchema.parse({ requestId, input });
const setup = {
  subject,
  clientId: id,
  clientName: "Synthetic",
  website: null,
  selectedIdentities: [],
  suggestedIdentities: [],
  taskPreview: [],
};
const run = (patch: Record<string, unknown> = {}) => ({
  id: requestId,
  subject,
  clientId: id,
  status: "running",
  requestedSources: [],
  sourceStates: {},
  summary: {},
  error: null,
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: null,
  findings: [],
  setup: { purpose: "alignment", capabilityId: capability },
  attachmentIds: [doc],
  selectedLdaIds: [],
  ...patch,
});
beforeEach(() => {
  vi.clearAllMocks();
  h.lock.mockImplementation((fn) => fn());
});
it("denied source preparation never creates a command or sends a research POST", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ message: "Denied" }, { status: 403 }),
  );
  await expect(
    prepareResearch(
      createApiClient(fetch),
      subject,
      input,
      () => {},
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
});
it("revocation while preparing documents never reaches a research POST", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>(async () => Response.json(setup))
    .mockImplementationOnce(async () => Response.json(setup))
    .mockImplementationOnce(async () =>
      Response.json({ message: "Source removed" }, { status: 403 }),
    );
  await expect(
    prepareResearch(
      createApiClient(fetch),
      subject,
      input,
      () => {},
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.every((call) => call[1]?.method === "GET")).toBe(
    true,
  );
});
it("aborted sends never POST or acknowledge a scoped command", async () => {
  const abort = new AbortController();
  abort.abort();
  const fetch = vi.fn(),
    received = vi.fn();
  await expect(
    sendResearch(
      createApiClient(fetch),
      subject,
      command,
      () => {},
      abort.signal,
      received,
    ),
  ).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
  expect(received).not.toHaveBeenCalled();
});
it.each([{ requestedSources: ["public_web"] }, { attachmentIds: [] }])(
  "does not acknowledge a scoped result that changes the selected corpus: %j",
  async (patch) => {
    const received = vi.fn(),
      api = createApiClient(async () => Response.json(run(patch)));
    await expect(
      sendResearch(
        api,
        subject,
        command,
        () => {},
        new AbortController().signal,
        received,
      ),
    ).rejects.toThrow("unexpected response");
    expect(received).not.toHaveBeenCalled();
  },
);
it("does not acknowledge a response that silently adds an unrequested capability scope", async () => {
  const received = vi.fn(),
    unscoped = researchCommandSchema.parse({
      requestId,
      input: {
        sources: [],
        attachmentIds: [doc],
        ldaClientIds: [],
        website: "",
      },
    });
  await expect(
    sendResearch(
      createApiClient(async () => Response.json(run())),
      subject,
      unscoped,
      () => {},
      new AbortController().signal,
      received,
    ),
  ).rejects.toThrow("unexpected response");
  expect(received).not.toHaveBeenCalled();
});
it("recovery keeps the original command when the fetched durable run changes its sources", async () => {
  h.load.mockResolvedValue({ command, confirmed: true });
  const ops = researchOperations({
    api: createApiClient(async (request) =>
      Response.json(
        String(request).endsWith("/review")
          ? {
              subject,
              clientId: id,
              runId: requestId,
              clientRevision: "a".repeat(64),
              findings: [],
            }
          : run({ requestedSources: ["public_web"] }),
      ),
    ),
    subject,
    actor: { tenantId: id, userId: capability },
    guard: () => {},
    signal: () => new AbortController().signal,
    install: vi.fn(),
  });
  await expect(ops.recover()).rejects.toThrow("scope");
  expect(h.acknowledge).not.toHaveBeenCalled();
});

it("accepts normalized explicit websites and previously imported LDA identities", async () => {
  const received = vi.fn();
  const selected = researchCommandSchema.parse({
    requestId,
    input: {
      ...input,
      website: "https://EXAMPLE.test#section",
      ldaClientIds: [12],
    },
  });
  await sendResearch(
    createApiClient(async () =>
      Response.json(
        run({
          setup: {
            purpose: "alignment",
            capabilityId: capability,
            website: "https://example.test/",
          },
          selectedLdaIds: [24, 12],
        }),
      ),
    ),
    subject,
    selected,
    () => {},
    new AbortController().signal,
    received,
  );
  expect(received).toHaveBeenCalledWith(selected);
});

it.each([
  {
    setup: {
      purpose: "alignment",
      capabilityId: capability,
      website: "https://other.test/",
    },
    selectedLdaIds: [12],
  },
  {
    setup: {
      purpose: "alignment",
      capabilityId: capability,
      website: "https://example.test/",
    },
    selectedLdaIds: [],
  },
])(
  "rejects a changed explicit website or omitted selected identity: %j",
  async (patch) => {
    const received = vi.fn();
    const selected = researchCommandSchema.parse({
      requestId,
      input: { ...input, website: "https://example.test", ldaClientIds: [12] },
    });
    await expect(
      sendResearch(
        createApiClient(async () => Response.json(run(patch))),
        subject,
        selected,
        () => {},
        new AbortController().signal,
        received,
      ),
    ).rejects.toThrow("unexpected response");
    expect(received).not.toHaveBeenCalled();
  },
);
