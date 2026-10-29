import { describe, expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import { capiroOperations } from "../src/shared/capiro/registry";
import { coreSessionAuthentication } from "../src/shared/preview/core-session-authentication";
import { completedReportOperations as operations } from "../src/shared/capiro/operations/meri-completed-reports";
import {
  createLegacyReportClient,
  type LegacyReportClient,
} from "../src/shared/meri-reports/client";
import { LegacyReportController } from "../src/shared/meri-reports/state";

const id = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const report = {
  id,
  artifactId: "33333333-3333-4333-8333-333333333333",
  title: "Synthetic retained report",
  kind: "research" as const,
  clientId,
  createdAt: "2026-10-27T10:00:00.000Z",
  updatedAt: "2026-10-27T10:00:00.000Z",
  markdown: "# Original saved report\n\nSynthetic cited text.",
};
const { markdown: _markdown, ...summary } = report;
const cursor = "A".repeat(80);
const config = {
  services: { core: "https://core.example.test/api" },
  authConfigured: true,
  issues: [],
};

describe("completed legacy report canonical receiving", () => {
  it("selects the existing native session only for approved completed-report preview GET routes", async () => {
    const nativeBase = "https://first-chat-preview.app-dev.capiro.ai/api";
    const token = vi.fn(async () => "synthetic-native-session");
    for (const [operation, input, result] of [
      [
        "meri.reports.completed.list",
        { query: { limit: 10 } },
        { reports: [summary], nextCursor: null },
      ],
      ["meri.reports.completed.read", { params: { id } }, report],
    ] as const) {
      const url = new URL(
        `https://frontend.example.test/api/capiro/${operation}`,
      );
      url.searchParams.set("input", JSON.stringify(input));
      const response = await handleCapiroRequest(
        new Request(url),
        operation,
        capiroOperations,
        { ...config, services: { core: nativeBase } },
        token,
        async () => Response.json(result),
      );
      expect(response.status).toBe(200);
    }
    expect(token.mock.calls).toEqual([["clerk-session"], ["clerk-session"]]);
    for (const path of [
      "/clio/completed-reports",
      `/clio/completed-reports/${id}`,
    ]) {
      expect(coreSessionAuthentication("core", nativeBase, "HEAD", path)).toBe(
        "clerk-session",
      );
      expect(
        coreSessionAuthentication("core", config.services.core, "GET", path),
      ).toBeUndefined();
      for (const method of ["POST", "PUT", "DELETE"])
        expect(
          coreSessionAuthentication("core", nativeBase, method, path),
        ).toBeUndefined();
    }
    for (const path of [
      "/clio/research",
      "/clio/completed-reports-extra",
      `/clio/completed-reports/${id}/export`,
    ])
      expect(
        coreSessionAuthentication("core", nativeBase, "GET", path),
      ).toBeUndefined();
  });

  it("uses only fixed authenticated Core GET reads, preserves identities/text, and narrows the current client", async () => {
    const upstream = vi.fn(async (url: string | URL | Request) =>
      Response.json(
        String(url).includes(`/completed-reports/${id}`)
          ? report
          : { reports: [summary], nextCursor: null },
      ),
    );
    const token = vi.fn(async () => "synthetic-session-token");
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input), "https://frontend.example.test");
      return handleCapiroRequest(
        new Request(url, init),
        url.pathname.split("/").at(-1)!,
        capiroOperations,
        config,
        token,
        upstream,
      );
    };
    const client = createLegacyReportClient(
      createCapiroApi(operations, { fetcher }),
      clientId,
    );
    expect(await client.list(null, new AbortController().signal)).toEqual({
      reports: [summary],
      nextCursor: null,
    });
    expect(await client.read(id, new AbortController().signal)).toEqual(report);
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(token).toHaveBeenCalledTimes(2);
    const calls = upstream.mock.calls as unknown as [string, RequestInit][];
    expect(String(calls[0]![0])).toBe(
      `https://core.example.test/api/clio/completed-reports?clientId=${clientId}&limit=10`,
    );
    expect(String(calls[1]![0])).toBe(
      `https://core.example.test/api/clio/completed-reports/${id}`,
    );
    for (const [, init] of calls) {
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
    }
    expect(JSON.stringify(calls)).not.toMatch(
      /research\/.*(?:stream|export)|bootstrap|nextTurn|firstChat/,
    );
  });

  it("refuses unregistered body fields, wrong identity/client and duplicate rows", async () => {
    expect(
      operations["meri.reports.completed.list"].request.safeParse({
        query: { limit: 10 },
        body: { resume: true },
      }).success,
    ).toBe(false);
    expect(
      operations["meri.reports.completed.read"].request.safeParse({
        params: { id },
        body: {},
      }).success,
    ).toBe(false);
    let payload: unknown = { ...report, id: report.artifactId };
    const client = createLegacyReportClient(
      createCapiroApi(operations, {
        fetcher: async () => Response.json(payload),
      }),
      clientId,
    );
    await expect(client.read(id, new AbortController().signal)).rejects.toThrow(
      "did not match",
    );
    payload = { ...report, clientId: null };
    await expect(client.read(id, new AbortController().signal)).rejects.toThrow(
      "did not match",
    );
    payload = { reports: [summary, summary], nextCursor: null };
    await expect(
      client.list(null, new AbortController().signal),
    ).rejects.toThrow("did not match");
    payload = { reports: [{ ...summary, clientId: null }], nextCursor: null };
    await expect(
      client.list(null, new AbortController().signal),
    ).rejects.toThrow("did not match");
  });

  it("preserves General/all-client discovery and current-source withholding without retry or legacy fallback", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ message: "Source withheld" }, { status: 409 }),
    );
    const client = createLegacyReportClient(
      createCapiroApi(operations, { fetcher }),
    );
    await expect(
      client.read(id, new AbortController().signal),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const input = new URL(
      String(fetcher.mock.calls[0]![0]),
      "https://frontend.example.test",
    ).searchParams.get("input");
    expect(JSON.parse(input!)).toEqual({ params: { id } });
    const readOnly = vi.fn<typeof fetch>(async () =>
      Response.json({
        reports: [{ ...summary, clientId: null, kind: "original-legacy-kind" }],
        nextCursor: null,
      }),
    );
    const page = await createLegacyReportClient(
      createCapiroApi(operations, { fetcher: readOnly }),
    ).list(null, new AbortController().signal);
    expect(page.reports[0]!.clientId).toBeNull();
    expect(page.reports[0]!.kind).toBe("original-legacy-kind");
  });
});

function fixture() {
  const client: LegacyReportClient = {
    list: vi.fn(async () => ({ reports: [summary], nextCursor: null })),
    read: vi.fn(async () => report),
  };
  const controller = new LegacyReportController(client),
    unmount = controller.mount();
  return { client, controller, unmount };
}

describe("completed report lifecycle", () => {
  it("keeps an empty authorized page with continuation navigable rather than claiming the end", async () => {
    const f = fixture();
    vi.mocked(f.client.list).mockResolvedValueOnce({
      reports: [],
      nextCursor: cursor,
    });
    await f.controller.load();
    expect(f.controller.snapshot()).toMatchObject({
      reports: [],
      cursor,
      loaded: true,
    });
    await f.controller.load();
    expect(f.controller.snapshot()).toMatchObject({
      reports: [summary],
      cursor: null,
    });
    expect(f.client.list).toHaveBeenNthCalledWith(
      2,
      cursor,
      expect.any(AbortSignal),
    );
    await f.controller.load();
    expect(f.client.list).toHaveBeenCalledTimes(2);
  });

  it("rechecks every open/download and removes prior content after a current refusal", async () => {
    const f = fixture();
    await f.controller.load();
    expect(await f.controller.open(id)).toEqual(report);
    expect(await f.controller.open(id)).toEqual(report);
    expect(f.client.read).toHaveBeenCalledTimes(2);
    vi.mocked(f.client.read).mockRejectedValueOnce(Error("revoked"));
    expect(await f.controller.open(id)).toBeNull();
    expect(f.controller.snapshot()).toMatchObject({
      selected: null,
      reports: [],
      loaded: false,
    });
    expect(f.controller.snapshot().problem).toContain("current access");
  });

  it("aborts account/client unmount and ignores a late report body", async () => {
    const f = fixture();
    await f.controller.load();
    let resolve!: (value: typeof report) => void;
    vi.mocked(f.client.read).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const opening = f.controller.open(id);
    f.unmount();
    resolve(report);
    expect(await opening).toBeNull();
    expect(f.controller.snapshot().selected).toBeNull();
    expect(vi.mocked(f.client.read).mock.calls[0]![1].aborted).toBe(true);
  });

  it("refuses repeated paging and unknown report selectors without retaining stale metadata", async () => {
    const f = fixture();
    vi.mocked(f.client.list).mockResolvedValue({
      reports: [summary],
      nextCursor: cursor,
    });
    await f.controller.load();
    await f.controller.load();
    expect(f.controller.snapshot()).toMatchObject({
      reports: [],
      loaded: false,
      selected: null,
    });
    expect(f.controller.snapshot().problem).not.toBeNull();
    expect(await f.controller.open(report.artifactId)).toBeNull();
    expect(f.client.read).not.toHaveBeenCalled();
  });
});
