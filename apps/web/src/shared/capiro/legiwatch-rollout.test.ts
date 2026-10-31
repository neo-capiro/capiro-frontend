import { expect, it, vi } from "vitest";
import { z } from "zod";
import { handleCapiroRequest } from "./gateway";
import { capiroOperations as operations } from "./registry";

const config = {
  services: { intelligence: "https://intel.example.test" },
  authConfigured: true,
  issues: [],
};
const origin = "https://frontend.example.test";
async function dispatch(
  key: keyof typeof operations,
  input: unknown,
  payload: unknown,
) {
  const method = operations[key].method;
  const query =
    method === "GET"
      ? `?input=${encodeURIComponent(JSON.stringify(input))}`
      : "";
  const request = new Request(`${origin}/api/capiro/${key}${query}`, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(input) }),
  });
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(payload));
  const authenticate = vi.fn(async () => "synthetic-token");
  const response = await handleCapiroRequest(
    request,
    key,
    operations,
    config,
    authenticate,
    fetcher,
  );
  return { response, fetcher, authenticate };
}

it("cached run names dispatch through current authenticated retained delivery routes", async () => {
  const { response, fetcher, authenticate } = await dispatch(
    "legiwatch.report.run",
    { params: { id: "run-one" } },
    {
      id: "run-one",
      reportId: "scope-one",
      definitionVersion: 2,
      audience: "internal",
      cutoff: "2026-10-31",
      contentHash: "hash",
      complete: true,
      generatedAt: "2026-10-31T00:00:00Z",
      rendered: { text: "Frozen briefing", html: "<p>Frozen briefing</p>" },
    },
  );
  expect(response.status).toBe(200);
  expect(authenticate).toHaveBeenCalled();
  expect(String(fetcher.mock.calls[0]?.[0])).toContain(
    "/legiwatch/deliveries/runs/run-one",
  );
  for (const [oldKey, currentKey] of [
    ["legiwatch.report.compose", "legiwatch.delivery.compose"],
    ["legiwatch.report.send", "legiwatch.delivery.send"],
    ["legiwatch.report.recipients", "legiwatch.delivery.recipients"],
    ["legiwatch.report.deliveries", "legiwatch.delivery.history"],
  ] as const)
    expect(operations[oldKey]).toBe(operations[currentKey]);
});

it("cached briefing preview preserves report identity and definition version through the gateway", async () => {
  const body = {
    selectionId: "selection",
    reportId: "report",
    audience: "internal",
    acceptSourceGaps: false,
  };
  const payload = {
    reportId: "report",
    definitionVersion: 2,
    audience: "internal",
    rendered: { text: "Edition", html: "<p>Edition</p>" },
    approvalHash: "exact-hash",
    deliveryState: "internal_review_only",
  };
  const { response, fetcher } = await dispatch(
    "legiwatch.briefing.preview",
    { body },
    payload,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(payload);
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(body);
  expect(
    operations["legiwatch.briefing.approve"].request.safeParse({
      body: { ...body, approvalHash: payload.approvalHash },
    }).success,
  ).toBe(true);
});

it("cached briefing picker receives the old list shape without restoring definition writes", async () => {
  const payload = [
    {
      id: "report",
      name: "Folder briefing",
      folderIds: ["folder"],
      jurisdiction: "FL",
      sessionKey: "2026",
      settings: { actions: "last" },
      version: 2,
      archived: false,
      canEdit: true,
      sourceId: null,
      lastGeneratedAt: null,
    },
  ];
  const { response } = await dispatch("legiwatch.reports", {}, payload);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(payload);
  for (const key of [
    "legiwatch.report.create",
    "legiwatch.report.update",
    "legiwatch.report.generate",
    "legiwatch.subscriptions",
  ])
    expect(key in operations).toBe(false);
});

it("cached editorial metadata is accepted only with explicit research sources and no monitor work", () => {
  const config = {
    folderId: "folder",
    reportId: "report",
    template: "research_update",
    subject: "Research",
    includedKinds: ["research"],
    monitorIds: [],
    categoryMapping: { namespace: null, version: 1, entries: {} },
    schedule: {
      timezone: "UTC",
      hour: 8,
      minute: 0,
      weekdays: [1],
      noChange: "draft",
      sourceGap: "hold",
      mode: "prepare",
    },
    recipientSelection: [],
    prepareEnabled: true,
    sendEnabled: false,
    dictionaryScopeAccepted: true,
    acceptAvailableFields: false,
  };
  const request = operations["legiwatch.editorial.configure"].request;
  const parse = (next: unknown) =>
    request.safeParse({
      params: { id: "config" },
      body: { expectedVersion: 1, config: next },
    });
  expect(parse(config).success).toBe(true);
  for (const patch of [
    { includedKinds: ["news"] },
    { includedKinds: ["research", "budget"] },
    { monitorIds: ["old-monitor"] },
    { template: "morning_news_brief" },
  ])
    expect(parse({ ...config, ...patch }).success).toBe(false);
});

it("old editorial family metadata survives gateway projection for cached clients", () => {
  const parsed = operations[
    "legiwatch.editorial.configurations"
  ].response.parse({
    configurations: [
      {
        id: "config",
        source_key: "source",
        version: 1,
        state: "paused",
        source: {
          family: {
            displayName: "Research",
            categoryNamespace: null,
            categories: [],
          },
        },
        config: {},
      },
    ],
    draftLookupState: "available",
  });
  expect(parsed.configurations[0]?.source.family).toEqual({
    displayName: "Research",
    categoryNamespace: null,
    categories: [],
  });
});

// Exact cached wire shapes from bc6000fc, operations/legiwatch-report-schemas.ts
// reportRunSchema and operations/legiwatch-research-work.ts review/preview.
// Kept as test-only shapes so qualification does not depend on Git fetch depth.
const cachedRunSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  definitionVersion: z.number(),
  audience: z.string(),
  cutoff: z.string(),
  contentHash: z.string(),
  complete: z.boolean(),
  generatedAt: z.string(),
});
const cachedReview = z
  .object({
    selectionId: z.string().min(1).max(180),
    runId: z.string().min(1).max(180),
  })
  .strict();
const cachedPreview = z.object({
  approvalHash: z.string(),
  rendered: z.object({ text: z.string(), html: z.string() }),
  deliveryState: z.literal("internal_review_only"),
});

it("cached ResearchReportReview can list, preview and approve its selected frozen base through the gateway", async () => {
  const metadata = {
    id: "base-run",
    reportId: "report",
    definitionVersion: 2,
    audience: "internal",
    cutoff: "2026-10-01",
    contentHash: "base-hash",
    complete: true,
    generatedAt: "2026-10-02T00:00:00Z",
  };
  const history = await dispatch("legiwatch.report.history", {}, [metadata]);
  expect(history.response.status).toBe(200);
  expect(z.array(cachedRunSchema).parse(await history.response.json())).toEqual(
    [metadata],
  );
  const body = cachedReview.parse({
    selectionId: "selection",
    runId: metadata.id,
  });
  const payload = {
    approvalHash: "a".repeat(64),
    rendered: {
      text: "Frozen base\n\nREVIEWED CAPIRO RESEARCH\n\nEdited research",
      html: "<body>Frozen base<section>Edited research</section></body>",
    },
    deliveryState: "internal_review_only",
  };
  const preview = await dispatch(
    "legiwatch.research.report.preview",
    { body },
    payload,
  );
  expect(preview.response.status).toBe(200);
  const accepted = cachedPreview.parse(await preview.response.json());
  expect(accepted.rendered.text).toContain("Frozen base");
  expect(JSON.parse(String(preview.fetcher.mock.calls[0]?.[1]?.body))).toEqual(
    body,
  );
  const approvalBody = { ...body, approvalHash: accepted.approvalHash };
  const approval = await dispatch(
    "legiwatch.research.report.approve",
    { body: approvalBody },
    {
      runId: "reviewed-run",
      replayed: false,
      deliveryState: "internal_review_only",
    },
  );
  expect(approval.response.status).toBe(200);
  expect(JSON.parse(String(approval.fetcher.mock.calls[0]?.[1]?.body))).toEqual(
    approvalBody,
  );
});

it("cached history filters stay bounded typed reads and standalone research remains valid", () => {
  expect(
    operations["legiwatch.report.history"].request.safeParse({
      query: { reportId: "report", before: "2026-10-03T00:00:00Z" },
    }).success,
  ).toBe(true);
  expect(
    operations["legiwatch.report.history"].request.safeParse({
      query: { tenantId: "forged" },
    }).success,
  ).toBe(false);
  expect(
    operations["legiwatch.research.report.preview"].request.safeParse({
      body: { selectionId: "selection" },
    }).success,
  ).toBe(true);
  for (const runId of [null, "", { id: "base" }])
    expect(
      operations["legiwatch.research.report.preview"].request.safeParse({
        body: { selectionId: "selection", runId },
      }).success,
    ).toBe(false);
});
