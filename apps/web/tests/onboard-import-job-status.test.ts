import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import { createOnboardCoreApi } from "../src/shared/capiro/onboard-core-api";
import {
  importClientSelection,
  InterruptedImport,
  IMPORT_CHUNK_SIZE,
} from "../src/features/onboard/lib/import-client-selection";
import {
  clearImportRequest,
  importRequestStorageKey,
  readImportRequest,
  retainImportRequest,
  IMPORT_REQUEST_TTL_MS,
} from "../src/features/onboard/lib/import-request-intent";
import {
  deriveImportJobPanelState,
  importJobAttentionMessage,
  importJobCountsLine,
  importJobTaskStatus,
} from "../src/features/onboard/lib/import-job-status";
import { classifyImportJobFailure } from "../src/features/onboard/lib/use-import-job-reads";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";
import { ImportJobStatusPanel } from "../src/features/onboard/ui/ImportJobStatusPanel";
import { CapiroApiError } from "../src/shared/capiro/http";
import type { ImportJob } from "../src/shared/capiro/onboard-contracts";

const requestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const secondRequestId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const jobId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const clientId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const scope = { orgId: "org_synthetic", userId: "user_synthetic" };

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    raw: map,
  };
}

function syntheticJob(over: Partial<ImportJob> = {}): ImportJob {
  const base: ImportJob = {
    id: jobId,
    requestId,
    status: "running",
    terminal: false,
    stale: false,
    staleAfterSeconds: 900,
    ldaRegistrantId: 7,
    requestedIds: [11, 22],
    createdAt: "2026-10-30T09:00:00.000Z",
    updatedAt: "2026-10-30T09:01:00.000Z",
    startedAt: "2026-10-30T09:00:10.000Z",
    finishedAt: null,
    counts: {
      total: 2,
      processed: 1,
      successful: 1,
      rejected: 0,
      outstanding: 1,
      created: 1,
      alreadyPresent: 0,
    },
    items: [
      {
        ldaClientId: 11,
        outcome: "created",
        code: null,
        clientId,
        clientName: "Synthetic Alpha",
        processedAt: "2026-10-30T09:00:20.000Z",
      },
      {
        ldaClientId: 22,
        outcome: "pending",
        code: null,
        clientId: null,
        clientName: null,
        processedAt: null,
      },
    ],
  };
  return { ...base, ...over };
}

function renderPanel(props: Parameters<typeof ImportJobStatusPanel>[0]) {
  return renderToStaticMarkup(createElement(ImportJobStatusPanel, props));
}

describe("onboard durable import request identity", () => {
  it("issues and retains a distinct request id BEFORE each dispatch, for >100 selections", async () => {
    const issued = Array.from({ length: 3 }, (_, index) =>
      index === 0
        ? requestId
        : index === 1
          ? secondRequestId
          : "ffffffff-ffff-4fff-8fff-ffffffffffff",
    );
    const retainedBefore: string[] = [];
    let dispatched = 0;
    const ids = Array.from({ length: 250 }, (_, index) => index + 1);
    const chunk = vi.fn(async (selected: number[], id: string) => {
      expect(retainedBefore.at(-1)).toBe(id);
      expect(selected.length).toBeLessThanOrEqual(IMPORT_CHUNK_SIZE);
      dispatched += 1;
      return {
        created: selected.length,
        items: selected.map((ldaClientId) => ({
          id: `client-${ldaClientId}`,
          name: "Synthetic",
          ldaClientId,
        })),
        skipped: [],
      };
    });
    const result = await importClientSelection(ids, chunk, {
      issueRequestId: () => issued.shift()!,
      retainRequest: (request) => retainedBefore.push(request.requestId),
    });

    expect(dispatched).toBe(3);
    expect(chunk.mock.calls.map(([selected]) => selected.length)).toEqual([
      100, 100, 50,
    ]);
    expect(retainedBefore).toEqual([
      requestId,
      secondRequestId,
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
    ]);
    expect(result.created).toBe(250);
  });

  it("keeps the lost-answer identity for readback and reports unattempted ids separately", async () => {
    const retained: string[] = [];
    let issued = 0;
    const failure = await importClientSelection(
      Array.from({ length: 250 }, (_, index) => index + 1),
      vi.fn(async (selected: number[], id: string) => {
        if (id === secondRequestId)
          throw new CapiroApiError(503, "Unavailable");
        return {
          created: 0,
          items: [],
          skipped: selected.map((ldaClientId) => ({
            ldaClientId,
            reason: "Already imported",
          })),
        };
      }),
      {
        issueRequestId: () => (issued++ === 0 ? requestId : secondRequestId),
        retainRequest: (request) => retained.push(request.requestId),
        settleRequest: (request) => {
          retained.splice(retained.indexOf(request.requestId), 1);
        },
      },
    ).catch((caught) => caught);

    expect(failure).toBeInstanceOf(InterruptedImport);
    expect(failure.unknownRequestId).toBe(secondRequestId);
    expect(failure.unknownIds).toHaveLength(100);
    expect(failure.unattemptedIds).toHaveLength(50);
    // The acknowledged first chunk settled; the unconfirmed chunk stays retained.
    expect(retained).toEqual([secondRequestId]);
  });
});

describe("onboard import request session recovery", () => {
  it("survives a reload for the SAME account and is cleared by an account switch", () => {
    const storage = memoryStorage();
    retainImportRequest(scope, { requestId, ids: [11, 22] }, () => storage);
    // New hook lifetime after reload reads the same identity back.
    expect(readImportRequest(scope, () => storage)).toEqual({
      requestId,
      ids: [11, 22],
    });

    expect(
      readImportRequest(
        { orgId: "org_other", userId: scope.userId },
        () => storage,
      ),
    ).toBeNull();
    // Another account can never read or clear this account's retained identity.
    expect(readImportRequest(scope, () => storage)).toEqual({
      requestId,
      ids: [11, 22],
    });
  });

  it("rejects a stale or corrupt record instead of guessing an identity", () => {
    const storage = memoryStorage();
    retainImportRequest(scope, { requestId, ids: [11] }, () => storage);
    expect(
      readImportRequest(
        scope,
        () => storage,
        Date.now() + IMPORT_REQUEST_TTL_MS + 1,
      ),
    ).toBeNull();

    storage.setItem(importRequestStorageKey(scope), "{not-json");
    expect(readImportRequest(scope, () => storage)).toBeNull();

    retainImportRequest(scope, { requestId, ids: [11] }, () => storage);
    clearImportRequest(scope, () => storage, secondRequestId);
    expect(readImportRequest(scope, () => storage)).toEqual({
      requestId,
      ids: [11],
    });
    clearImportRequest(scope, () => storage, requestId);
    expect(readImportRequest(scope, () => storage)).toBeNull();
  });
});

describe("onboard durable import status receiving", () => {
  function consumer(responses: Array<() => Promise<Response>>) {
    const fetcher = vi.fn<typeof fetch>(async () => {
      const next = responses.shift();
      if (!next) throw new Error("unexpected request");
      return next();
    });
    const core = createOnboardCoreApi(
      createCapiroApi(capiroOperations, { fetcher }),
    );
    return { core, fetcher };
  }
  const chunkBody = {
    created: 0,
    items: [],
    skipped: [{ ldaClientId: 11, reason: "Already imported" }],
    job: {
      id: jobId,
      requestId,
      status: "completed",
      stale: false,
      counts: {
        total: 1,
        processed: 1,
        successful: 0,
        rejected: 1,
        outstanding: 0,
        created: 0,
        alreadyPresent: 0,
      },
    },
  };

  it("reconciles a lost POST reply by reading the SAME request, without a second POST", async () => {
    const { core, fetcher } = consumer([
      () => Promise.reject(new TypeError("network lost")),
      () =>
        Promise.resolve(
          Response.json({
            jobs: [syntheticJob({ status: "running" })],
            nextCursor: null,
            population: {
              total: 1,
              queued: 0,
              running: 1,
              partially_completed: 0,
              failed: 0,
              completed: 0,
            },
          }),
        ),
    ]);
    const outcome = await importClientSelection([11], (ids, id) =>
      core.importClientChunk(ids, id),
    ).catch((caught) => caught);
    expect(outcome).toBeInstanceOf(InterruptedImport);
    expect(outcome.unknownRequestId).toBeDefined();

    const page = await core.getImportJobs({
      requestId: outcome.unknownRequestId,
      limit: 1,
    });
    expect(page.jobs[0]!.id).toBe(jobId);
    const posts = fetcher.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(String(posts[0]![0])).toBe("/api/capiro/onboard.core.import");
    expect(JSON.parse(String(posts[0]![1]!.body))).toEqual({
      body: { ldaClientIds: [11], requestId: outcome.unknownRequestId },
    });
  });

  it("binds the chunk receipt to the dispatched identity and chunk size", async () => {
    const { core } = consumer([
      () => Promise.resolve(Response.json(chunkBody)),
    ]);
    await expect(
      core.importClientChunk([11], secondRequestId),
    ).rejects.toMatchObject({ status: 502 });
    const { core: ok } = consumer([
      () => Promise.resolve(Response.json(chunkBody)),
    ]);
    expect((await ok.importClientChunk([11], requestId)).job.id).toBe(jobId);
    await expect(ok.importClientChunk([], requestId)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("classifies revoked/hidden job reads as unavailable and keeps the page population", async () => {
    expect(classifyImportJobFailure(new CapiroApiError(404, "missing"))).toBe(
      "unavailable",
    );
    expect(classifyImportJobFailure(new CapiroApiError(403, "revoked"))).toBe(
      "unavailable",
    );
    expect(classifyImportJobFailure(new CapiroApiError(500, "boom"))).toBe(
      "error",
    );
  });

  it("surfaces Core's same-identity conflict without dispatching another request", async () => {
    const { core, fetcher } = consumer([
      () =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: "IMPORT_REQUEST_CONFLICT",
                message:
                  "This import request identity was already used for a different selection.",
              },
            },
            { status: 409 },
          ),
        ),
    ]);
    const failure = await core
      .importClientChunk([11, 22], requestId)
      .catch((caught) => caught);
    expect(failure).toMatchObject({
      status: 409,
      upstreamCode: "IMPORT_REQUEST_CONFLICT",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]!.body))).toEqual({
      body: { ldaClientIds: [11, 22], requestId },
    });
  });

  it("accepts terminal variants and pagination cursors with full-population counts", async () => {
    const { core } = consumer([
      () =>
        Promise.resolve(
          Response.json({
            jobs: [
              syntheticJob({
                status: "completed",
                terminal: true,
                finishedAt: "2026-10-30T09:05:00.000Z",
                counts: {
                  total: 2,
                  processed: 2,
                  successful: 2,
                  rejected: 0,
                  outstanding: 0,
                  created: 1,
                  alreadyPresent: 1,
                },
                items: [
                  {
                    ldaClientId: 11,
                    outcome: "created",
                    code: null,
                    clientId,
                    clientName: "Synthetic Alpha",
                    processedAt: "2026-10-30T09:00:20.000Z",
                  },
                  {
                    ldaClientId: 22,
                    outcome: "already_present",
                    code: null,
                    clientId,
                    clientName: "Synthetic Beta",
                    processedAt: "2026-10-30T09:00:30.000Z",
                  },
                ],
              }),
            ],
            nextCursor: "next-page",
            population: {
              total: 7,
              queued: 1,
              running: 1,
              partially_completed: 1,
              failed: 1,
              completed: 3,
            },
          }),
        ),
    ]);
    const page = await core.getImportJobs({ limit: 1 });
    expect(page.nextCursor).toBe("next-page");
    expect(page.population.total).toBe(7);
    expect(page.jobs[0]!.counts.alreadyPresent).toBe(1);
  });
});

describe("onboard import status surface states", () => {
  it("renders explicit loading, empty, unavailable and error states without retry/cancel actions", () => {
    for (const state of ["loading", "empty", "unavailable", "error"] as const) {
      const html = renderPanel({ state, errorMessage: "Synthetic failure" });
      expect(html).not.toMatch(/Retry|Cancel/);
    }
    expect(renderPanel({ state: "empty" })).toContain("No import job yet");
    expect(renderPanel({ state: "unavailable" })).toContain(
      "Import status unavailable",
    );
    expect(
      renderPanel({ state: "error", errorMessage: "Synthetic failure" }),
    ).toContain("Synthetic failure");
  });

  it("shows authoritative counts, created vs already-present, staleness and outstanding items", () => {
    const running = syntheticJob({ stale: true });
    const html = renderPanel({
      state: "ready",
      job: running,
      onRefresh: () => {},
    });
    expect(html).toContain("Running");
    expect(html).toContain("Needs attention");
    expect(html).toContain(importJobCountsLine(running.counts));
    expect(html).toContain("Unresolved LDA ids requiring operator action: 22");
    expect(html).toContain("never marks this job failed or completed");
    expect(html).not.toMatch(/Retry|Cancel/);

    const partial = syntheticJob({
      status: "partially_completed",
      terminal: true,
      stale: false,
      finishedAt: "2026-10-30T09:05:00.000Z",
      counts: {
        total: 2,
        processed: 2,
        successful: 1,
        rejected: 1,
        outstanding: 0,
        created: 1,
        alreadyPresent: 0,
      },
      items: [
        ...syntheticJob().items.slice(0, 1),
        {
          ldaClientId: 22,
          outcome: "rejected",
          code: "CLIENT_SLOT_LIMIT",
          clientId: null,
          clientName: null,
          processedAt: "2026-10-30T09:04:00.000Z",
        },
      ],
    });
    const partialHtml = renderPanel({ state: "ready", job: partial });
    expect(partialHtml).toContain("Partially completed");
    expect(partialHtml).toContain("Client slot limit reached");
    expect(partialHtml).toContain("1 created · 0 already present · 1 rejected");

    const failed = renderPanel({
      state: "ready",
      job: syntheticJob({
        status: "failed",
        terminal: true,
        counts: {
          total: 2,
          processed: 2,
          successful: 0,
          rejected: 2,
          outstanding: 0,
          created: 0,
          alreadyPresent: 0,
        },
      }),
    });
    expect(failed).toContain("Failed");
    expect(failed).not.toContain("Needs attention");
  });

  it("renders pagination, population and managed wording from Core contracts", () => {
    const html = renderPanel({
      state: "ready",
      job: syntheticJob({
        status: "completed",
        terminal: true,
        stale: false,
        finishedAt: "2026-10-30T09:05:00.000Z",
      }),
      jobs: [syntheticJob({ status: "completed", terminal: true })],
      population: {
        total: 4,
        queued: 0,
        running: 0,
        partially_completed: 0,
        failed: 0,
        completed: 4,
      },
      nextCursor: "older",
      onLoadMore: () => {},
      onSelectJob: () => {},
    });
    expect(html).toContain("4 import jobs");
    expect(html).toContain("Load older import jobs");
    expect(renderPanel({ state: "empty", managed: true })).toContain(
      "Capiro-managed import status appears here",
    );
  });

  it("keeps one derived state and completion signal", () => {
    expect(
      deriveImportJobPanelState({
        ready: true,
        loading: false,
        failure: "unavailable",
        totalJobs: 3,
      }),
    ).toBe("unavailable");
    expect(
      deriveImportJobPanelState({
        ready: true,
        loading: false,
        failure: null,
        totalJobs: 0,
      }),
    ).toBe("empty");
    expect(
      importJobTaskStatus(
        syntheticJob({ status: "completed", terminal: true }),
      ),
    ).toBe("done");
    expect(
      importJobTaskStatus(syntheticJob({ status: "failed", terminal: true })),
    ).toBe("progress");
    expect(importJobTaskStatus(syntheticJob({ stale: true }))).toBe("waiting");
    expect(importJobTaskStatus(null)).toBe("none");
    expect(importJobAttentionMessage(syntheticJob({ stale: true }))).toContain(
      "Ask a Capiro operator",
    );
    expect(
      importJobAttentionMessage(
        syntheticJob({
          terminal: true,
          status: "completed",
          counts: {
            total: 2,
            processed: 2,
            successful: 2,
            rejected: 0,
            outstanding: 0,
            created: 2,
            alreadyPresent: 0,
          },
        }),
      ),
    ).toBeNull();
  });
});

describe("onboard account-switch response fencing", () => {
  it("prevents a late response from the previous account from publishing", async () => {
    const cache = new QueryClient();
    let current = true;
    const attempt = createOnboardAttempt(
      cache,
      "client-import:test",
      () => current,
    );
    const cleanup = attempt.mount();
    let resolve!: (value: string) => void;
    const pending = attempt.run("Import reviewed selection", (guard) =>
      guard.wait(() => new Promise<string>((yes) => (resolve = yes))),
    );
    current = false;
    resolve("late owner payload");
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(attempt.read()?.phase).toBe("unknown");
    expect(attempt.read()?.phase).not.toBe("confirmed");
    cleanup();
  });
});
