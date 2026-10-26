import {
  createNewsletterLayout,
  defaultNewsletterConfig,
  type NewsletterCampaign,
} from "@capiro/shared/newsletter";
import { describe, expect, it, vi } from "vitest";
import { createCapiroApi } from "./http";
import { richNewsletterOperations as operations } from "./operations/rich-newsletter";
import { newsletterStagingOperations } from "./operations/workspace-newsletter-staging";
import { createRichNewsletterAdapter } from "./rich-newsletter";

const id = "b2222222-2222-7222-8222-222222222222";
const clientId = "e5555555-5555-4555-8555-555555555555";
const stageId = "a1111111-1111-4111-8111-111111111111";
const other = "d4444444-4444-4444-8444-444444444444";
const signal = () => new AbortController().signal;
const campaign = (): NewsletterCampaign => ({
  id,
  name: "Synthetic saved campaign",
  revision: 4,
  status: "draft",
  ownerId: "user_synthetic",
  updatedAt: "2026-10-13T02:00:00.000Z",
  design: createNewsletterLayout(1),
  config: { ...defaultNewsletterConfig(), clientId },
});
function consumer(payload: unknown, status = 200) {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(payload, { status }));
  const api = createCapiroApi(operations, { fetcher });
  return { fetcher, api, adapter: createRichNewsletterAdapter(api) };
}
const stageReceipt = () => ({
  id: stageId,
  documentId: id,
  revision: 4,
  name: "Synthetic stage",
  createdAt: "2026-10-13T02:00:00.000Z",
  route: `/engagement/outreach?newsletterStage=${stageId}`,
});
function ownedStage() {
  const saved = campaign();
  return {
    id: stageId,
    documentId: id,
    revision: 4,
    name: saved.name,
    config: saved.config,
    design: saved.design,
  };
}
function ownedRecord() {
  return {
    id: other,
    status: "draft",
    name: "Synthetic rich record",
    stage: ownedStage(),
    targets: [],
    senderConnectionId: clientId,
    subject: "",
    versions: [],
    intentId: null,
    excluded: [],
    tests: [
      {
        id: stageId,
        requestKey: "historical-test",
        senderConnectionId: clientId,
        versionId: other,
      },
    ],
  };
}

describe("fixed rich operations remain separate from saved-version staging", () => {
  it("exposes only the reviewed paths and refuses injected authority", () => {
    expect(
      Object.values(operations).map(({ method, path }) => `${method} ${path}`),
    ).toEqual([
      "GET /newsletters/documents",
      "POST /newsletters/documents",
      "GET /newsletters/documents/:id",
      "PATCH /newsletters/documents/:id",
      "POST /newsletters/documents/:id/preview",
      "POST /newsletters/documents/:id/stage",
      "GET /newsletters/documents/:id/stages/:revision",
      "GET /engagement/newsletters/stages/:id",
      "GET /engagement/newsletters/:id",
      "POST /engagement/newsletters/stages/:id/open",
    ]);
    for (const field of ["clientId", "ownerId", "tenantId", "requestId"])
      expect(
        operations["workspace.richNewsletter.create"].request.safeParse({
          body: { [field]: id },
        }).success,
      ).toBe(false);
    expect(
      operations["workspace.richNewsletter.list"].request.safeParse({
        body: {},
      }).success,
    ).toBe(false);
    expect(newsletterStagingOperations["workspace.newsletter.stage"].path).toBe(
      "/engagement/outreach-v3/sessions/:sessionId/newsletter-staging",
    );
  });
  it("accepts Workspace UUIDv7 while refusing it for a Core stage", () => {
    expect(
      operations["workspace.richNewsletter.detail"].request.safeParse({
        params: { id },
      }).success,
    ).toBe(true);
    expect(
      operations["engagement.richNewsletter.stage"].request.safeParse({
        params: { id },
      }).success,
    ).toBe(false);
  });
  it.each([null, [], "design"])(
    "refuses non-object full-save content %j",
    (design) => {
      const saved = campaign();
      expect(
        operations["workspace.richNewsletter.save"].request.safeParse({
          params: { id },
          body: { revision: 4, name: saved.name, design, config: saved.config },
        }).success,
      ).toBe(false);
    },
  );
  it.each([
    "00000000-0000-0000-0000-000000000000",
    "ffffffff-ffff-ffff-ffff-ffffffffffff",
  ])("refuses Workspace sentinel %s before dispatch", async (invalidId) => {
    const { adapter, fetcher } = consumer(campaign());
    await expect(
      adapter.detail(invalidId, clientId, signal()),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("receiving binds current requests without inventing authority", () => {
  it("receives the direct list and preserves other server-authorized clients", async () => {
    const saved = campaign();
    const { adapter, fetcher } = consumer({
      items: [
        saved,
        { ...saved, id: other, config: { ...saved.config, clientId: other } },
      ],
    });
    expect((await adapter.list(signal())).items).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("rejects a fabricated response wrapper", async () => {
    const { adapter } = consumer({ data: campaign() });
    await expect(adapter.detail(id, clientId, signal())).rejects.toMatchObject({
      status: 502,
    });
  });
  it.each(["document", "client", "null-client"])(
    "refuses a mismatched detail %s binding",
    async (kind) => {
      const saved = campaign();
      if (kind === "document") saved.id = other;
      else saved.config.clientId = kind === "client" ? other : null;
      await expect(
        consumer(saved).adapter.detail(id, clientId, signal()),
      ).rejects.toMatchObject({ status: 502 });
    },
  );
  it("accepts case-normalized identities without rewriting the returned spelling", async () => {
    const saved = campaign();
    saved.id = id.toUpperCase();
    expect(
      (await consumer(saved).adapter.detail(id, clientId, signal())).id,
    ).toBe(saved.id);
  });
  it("binds save to a captured submission while later edits survive independently", async () => {
    const saved = campaign();
    const body = {
      revision: 4,
      name: saved.name,
      design: saved.design,
      config: saved.config,
    };
    const committed = structuredClone({ ...saved, revision: 5 });
    const { adapter, fetcher } = consumer(committed);
    const pending = adapter.save(id, body, signal());
    body.config.clientId = other;
    body.name = "Later local edit";
    expect((await pending).revision).toBe(5);
    const submitted = JSON.parse(String(fetcher.mock.calls[0]![1]!.body));
    expect(submitted.body.config.clientId).toBe(clientId);
    expect(body.name).toBe("Later local edit");
  });
  it.each([4, 6])(
    "refuses successful save at unexpected revision %i without replay",
    async (revision) => {
      const saved = campaign();
      const { adapter, fetcher } = consumer({ ...saved, revision });
      await expect(
        adapter.save(
          id,
          {
            revision: 4,
            name: saved.name,
            design: saved.design,
            config: saved.config,
          },
          signal(),
        ),
      ).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it.each([409, 503])(
    "preserves the failed save and dispatches once for HTTP%i",
    async (status) => {
      const saved = campaign();
      const body = {
        revision: 4,
        name: saved.name,
        design: saved.design,
        config: saved.config,
      };
      const before = structuredClone(body);
      const { adapter, fetcher } = consumer(
        { message: "Synthetic refusal" },
        status,
      );
      await expect(adapter.save(id, body, signal())).rejects.toMatchObject({
        status,
      });
      expect(body).toEqual(before);
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it("binds saved preview identity without trusting or following its HTML", async () => {
    const preview = {
      documentId: id,
      revision: 4,
      renderHash: "a".repeat(64),
      hashFormat: "newsletter-render-json-v1",
      html: "<script>untrusted()</script>",
      plainText: "saved",
      checks: [],
    };
    const { adapter, fetcher } = consumer(preview);
    expect(await adapter.preview(id, 4, false, signal())).toEqual(preview);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("validates stage creation independently and never follows the returned route", async () => {
    const receipt = stageReceipt();
    const { adapter, fetcher } = consumer(receipt);
    expect(await adapter.stage(id, 4, signal())).toEqual(receipt);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("rejects a stage creation receipt as a dedicated stage read", async () => {
    await expect(
      consumer(stageReceipt()).adapter.stageDetail(
        stageId,
        { documentId: id, revision: 4, clientId },
        signal(),
      ),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("receives an independently bound dedicated stage snapshot", async () => {
    const value = ownedStage();
    expect(
      await consumer(value).adapter.stageDetail(
        stageId,
        { documentId: id, revision: 4, clientId },
        signal(),
      ),
    ).toEqual(value);
  });
  it("preserves a historical test whose version is absent from current versions", async () => {
    const value = ownedRecord();
    const { adapter, fetcher } = consumer(value);
    const received = await adapter.record(
      other,
      { stageId, documentId: id, revision: 4, clientId },
      signal(),
    );
    expect(received).toEqual(value);
    expect(received.versions).toEqual([]);
    expect(received.tests[0]!.versionId).toBe(other);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("refuses a valid record belonging to a different requested record ID", async () => {
    await expect(
      consumer(ownedRecord()).adapter.record(stageId, { clientId }, signal()),
    ).rejects.toMatchObject({ status: 502 });
  });
  it.each(["stage", "record"])(
    "captures %s read bindings before the response arrives",
    async (kind) => {
      const saved = campaign();
      const expected = { documentId: id, revision: 4, clientId };
      const stage = {
        id: stageId,
        documentId: other,
        revision: 5,
        name: saved.name,
        config: { ...saved.config, clientId: other },
        design: saved.design,
      };
      const record = {
        id: other,
        status: "draft",
        name: saved.name,
        stage,
        targets: [],
        senderConnectionId: null,
        subject: "",
        versions: [],
        intentId: null,
        excluded: [],
        tests: [],
      };
      let resolveResponse!: (response: Response) => void;
      const fetcher = vi.fn<typeof fetch>().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveResponse = resolve;
          }),
      );
      const adapter = createRichNewsletterAdapter(
        createCapiroApi(operations, { fetcher }),
      );
      const pending =
        kind === "stage"
          ? adapter.stageDetail(stageId, expected, signal())
          : adapter.record(other, expected, signal());
      Object.assign(expected, {
        documentId: other,
        revision: 5,
        clientId: other,
      });
      resolveResponse(Response.json(kind === "stage" ? stage : record));
      await expect(pending).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it.each(["documentId", "revision"])(
    "rejects a stage creation with wrong %s",
    async (field) => {
      const value = {
        ...stageReceipt(),
        [field]: field === "revision" ? 5 : other,
      };
      await expect(
        consumer(value).adapter.stage(id, 4, signal()),
      ).rejects.toMatchObject({ status: 502 });
    },
  );
  it("rejects a late response after scope replacement", async () => {
    const lifetime = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      lifetime.abort();
      return Response.json(campaign());
    });
    const api = createCapiroApi(operations, {
      fetcher,
      scopeSignal: () => lifetime.signal,
    });
    await expect(
      createRichNewsletterAdapter(api).detail(id, clientId, signal()),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("exact preview and staged-revision receiving", () => {
  it.each([
    { documentId: other },
    { revision: 5 },
    { documentId: undefined },
    { renderHash: undefined },
    { renderHash: "not-a-digest" },
    { hashFormat: "different-format" },
  ])("refuses an unbound preview %j without replay", async (change) => {
    const { adapter, fetcher } = consumer({
      documentId: id,
      revision: 4,
      renderHash: "a".repeat(64),
      hashFormat: "newsletter-render-json-v1",
      html: "saved",
      plainText: "saved",
      checks: [],
      ...change,
    });
    await expect(adapter.preview(id, 4, false, signal())).rejects.toMatchObject(
      { status: 502 },
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([null, stageReceipt()])(
    "preserves the exact stage result %j with a GET only",
    async (value) => {
      const { adapter, fetcher } = consumer(value);
      expect(await adapter.stagedRevision(id, 4, signal())).toEqual(value);
      expect(fetcher).toHaveBeenCalledOnce();
      const [url, options] = fetcher.mock.calls[0]!;
      expect(options?.method).toBe("GET");
      expect(options?.body).toBeUndefined();
      expect(String(url)).toContain("workspace.richNewsletter.stagedRevision");
      expect(decodeURIComponent(String(url))).toContain(
        JSON.stringify({ params: { id, revision: 4 } }),
      );
    },
  );
  it.each([{ documentId: other }, { revision: 5 }])(
    "binds stage recovery identity %j",
    async (change) => {
      const { adapter, fetcher } = consumer({ ...stageReceipt(), ...change });
      await expect(
        adapter.stagedRevision(id, 4, signal()),
      ).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it("keeps denied lookup distinct from null and rejects invalid revision before dispatch", async () => {
    const { adapter, fetcher } = consumer({}, 403);
    await expect(adapter.stagedRevision(id, 4, signal())).rejects.toMatchObject(
      { status: 403 },
    );
    await expect(adapter.stagedRevision(id, 0, signal())).rejects.toMatchObject(
      { status: 400 },
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("explicit native rich-stage opening", () => {
  it("uses only the exact stage ID and returns its bound saved record", async () => {
    const value = ownedRecord();
    const { adapter, fetcher } = consumer(value);
    expect(await adapter.open(ownedStage(), signal())).toEqual(value);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(String(url)).toContain("engagement.richNewsletter.open");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({
      params: { id: stageId },
    });
    expect(
      operations["engagement.richNewsletter.open"].request.safeParse({
        params: { id: stageId },
        body: { tenantId: id },
      }).success,
    ).toBe(false);
  });
  it.each(["id", "documentId", "revision", "clientId"])(
    "refuses an open result with a changed %s and never redispatches",
    async (field) => {
      const value = ownedRecord();
      if (field === "clientId") value.stage.config.clientId = other;
      else if (field === "revision") value.stage.revision = 5;
      else if (field === "documentId") value.stage.documentId = other;
      else value.stage.id = other;
      const { adapter, fetcher } = consumer(value);
      await expect(adapter.open(ownedStage(), signal())).rejects.toMatchObject({
        status: 502,
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it("captures the reviewed binding before the open response arrives", async () => {
    const stage = ownedStage();
    const value = ownedRecord();
    value.stage.revision = 5;
    let finish!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const adapter = createRichNewsletterAdapter(
      createCapiroApi(operations, { fetcher }),
    );
    const pending = adapter.open(stage, signal());
    stage.revision = 5;
    finish(Response.json(value));
    await expect(pending).rejects.toMatchObject({ status: 502 });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([403, 503])(
    "preserves HTTP%i without treating it as no effect or retrying",
    async (status) => {
      const { adapter, fetcher } = consumer(
        { message: "Synthetic failure after dispatch" },
        status,
      );
      await expect(adapter.open(ownedStage(), signal())).rejects.toMatchObject({
        status,
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
});
