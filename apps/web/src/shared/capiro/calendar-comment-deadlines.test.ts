import { expect, it, vi } from "vitest";
import type { CapiroConfig } from "./config";
import { handleCapiroRequest } from "./gateway";
import { capiroOperations } from "./registry";

// Synthetic payload from capirov2@46aa2164c299151225c6cdb9f3cc565fee347657
// FederalRegisterService.getCommentDeadlineCalendar; no backend implementation copied.
const operation = "calendar.commentDeadlineCalendar";
const query = {
  dateFrom: "2026-09-01",
  dateTo: "2026-12-31",
  page: 2,
  limit: 1,
};
const config: CapiroConfig = {
  services: { core: "https://core.example.test/api" },
  authConfigured: true,
  issues: [],
};
function commentPage() {
  return {
    data: [
      {
        documentNumber: "2026-12345",
        title: "Synthetic comment notice",
        agencyNames: ["Synthetic agency"],
        htmlUrl: null,
        date: "2026-12-31",
        dateKind: "comment_deadline",
        precision: "date",
        provenance: {
          source: "federal_register",
          sourceField: "comments_close_on",
          cachedField: "commentEndDate",
          rawPublisherValueVerified: false,
        },
      },
    ],
    range: { dateFrom: "2026-09-01", dateTo: "2026-12-31" },
    page: 2,
    limit: 1,
    pagination: {
      totalCandidates: 3,
      returned: 1,
      excludedOnPage: 0,
      hasMoreCandidates: true,
    },
    coverage: {
      scope: "locally_ingested_comment_deadlines",
      complete: false,
      allFederalDocuments: false,
      asOf: "2026-10-13T00:00:00.000Z",
      latestIngestion: null,
      limitation:
        "Cached source dates only; ingestion status does not establish complete or current publisher coverage.",
    },
  };
}
function read(input: unknown = { query }) {
  return new Request(
    `https://frontend.example.test/api/capiro/${operation}?input=${encodeURIComponent(JSON.stringify(input))}`,
    {
      headers: {
        Cookie: "synthetic-session=untrusted",
        "X-Tenant-Id": "untrusted-tenant",
      },
    },
  );
}
function gateway(payload: unknown = commentPage(), status = 200) {
  const auth = vi.fn(
    async (): Promise<string | null> => "synthetic-trusted-clerk-token",
  );
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(payload, { status }));
  const execute = (request = read()) =>
    handleCapiroRequest(
      request,
      operation,
      capiroOperations,
      config,
      auth,
      fetcher,
    );
  return { auth, fetcher, execute };
}

it("forwards the exact native GET range and trusted bearer without browser authority or writes", async () => {
  const fixture = gateway();
  const response = await fixture.execute();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(commentPage());
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(fixture.auth).toHaveBeenCalledTimes(1);
  expect(fixture.fetcher).toHaveBeenCalledTimes(1);
  const [url, init] = fixture.fetcher.mock.calls[0]!;
  expect(String(url)).toBe(
    "https://core.example.test/api/federal-register/comment-deadline-calendar?dateFrom=2026-09-01&dateTo=2026-12-31&page=2&limit=1",
  );
  expect(init).toMatchObject({
    method: "GET",
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
  });
  expect(init?.headers).toEqual({
    Authorization: "Bearer synthetic-trusted-clerk-token",
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  expect(init?.body).toBeUndefined();
  expect(init?.signal).toBeInstanceOf(AbortSignal);
});

it("leaves omitted paging to native defaults and preserves empty incomplete cache truth", async () => {
  const page = commentPage();
  const payload = {
    ...page,
    data: [],
    page: 1,
    limit: 50,
    pagination: {
      totalCandidates: 0,
      returned: 0,
      excludedOnPage: 0,
      hasMoreCandidates: false,
    },
  };
  const fixture = gateway(payload);
  const response = await fixture.execute(read({ query: page.range }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(payload);
  expect(fixture.fetcher).toHaveBeenCalledTimes(1);
  expect(String(fixture.fetcher.mock.calls[0]![0])).toBe(
    "https://core.example.test/api/federal-register/comment-deadline-calendar?dateFrom=2026-09-01&dateTo=2026-12-31",
  );
});

it.each([
  { dateFrom: "2024-02-29", dateTo: "2024-02-29", page: 1, limit: 1 },
  { dateFrom: "2024-01-01", dateTo: "2025-01-01", page: 10000, limit: 100 },
])(
  "admits real leap dates and inclusive native query bounds: %j",
  async (input) => {
    const page = commentPage();
    const payload = {
      ...page,
      data: [],
      range: { dateFrom: input.dateFrom, dateTo: input.dateTo },
      page: input.page,
      limit: input.limit,
      pagination: {
        totalCandidates: 0,
        returned: 0,
        excludedOnPage: 0,
        hasMoreCandidates: false,
      },
    };
    const fixture = gateway(payload);
    const response = await fixture.execute(read({ query: input }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(fixture.fetcher).toHaveBeenCalledTimes(1);
    expect(
      Object.fromEntries(
        new URL(String(fixture.fetcher.mock.calls[0]![0])).searchParams,
      ),
    ).toEqual({
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      page: String(input.page),
      limit: String(input.limit),
    });
  },
);

it.each([
  { dateFrom: "2026-02-30" },
  { dateFrom: "2025-02-29" },
  { dateFrom: "2026-09-01T00:00:00Z" },
  { dateFrom: "2026-9-01" },
  { dateFrom: "2027-01-01" },
  { dateTo: "2027-09-03" },
  { dateFrom: null },
  { dateTo: undefined },
  { page: 0 },
  { page: 10001 },
  { page: 1.5 },
  { page: "1" },
  { limit: 0 },
  { limit: 101 },
  { limit: 1.5 },
  { limit: "50" },
  { clientId: "untrusted-client" },
  { tenantId: "untrusted-tenant" },
  { refresh: true },
])(
  "refuses invalid dates, range, paging or extra query before auth/fetch: %j",
  async (change) => {
    const fixture = gateway();
    const response = await fixture.execute(
      read({ query: { ...query, ...change } }),
    );
    expect(response.status).toBe(400);
    expect(fixture.auth).not.toHaveBeenCalled();
    expect(fixture.fetcher).not.toHaveBeenCalled();
  },
);

it.each([{}, { query, body: {} }, { query, tenantId: "untrusted-tenant" }])(
  "rejects missing query or extra operation fields before dispatch: %j",
  async (input) => {
    const fixture = gateway();
    expect((await fixture.execute(read(input))).status).toBe(400);
    expect(fixture.auth).not.toHaveBeenCalled();
    expect(fixture.fetcher).not.toHaveBeenCalled();
  },
);

it("rejects POST with405 and zero upstream effects", async () => {
  const fixture = gateway();
  const request = new Request(
    `https://frontend.example.test/api/capiro/${operation}`,
    {
      method: "POST",
      headers: {
        Origin: "https://frontend.example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  expect((await fixture.execute(request)).status).toBe(405);
  expect(fixture.auth).not.toHaveBeenCalled();
  expect(fixture.fetcher).not.toHaveBeenCalled();
});

it("returns401 with no upstream read when the trusted token is absent", async () => {
  const fixture = gateway();
  fixture.auth.mockResolvedValue(null);
  expect((await fixture.execute()).status).toBe(401);
  expect(fixture.auth).toHaveBeenCalledTimes(1);
  expect(fixture.fetcher).not.toHaveBeenCalled();
});

it.each([401, 403, 404, 500, 503])(
  "retains native%s without diagnostics or invented empty success",
  async (status) => {
    const fixture = gateway(
      { message: "synthetic-private-upstream-detail" },
      status,
    );
    const response = await fixture.execute();
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain(
      "synthetic-private-upstream-detail",
    );
    expect(fixture.fetcher).toHaveBeenCalledTimes(1);
  },
);

it.each([
  { coverage: { ...commentPage().coverage, complete: true } },
  { coverage: { ...commentPage().coverage, allFederalDocuments: true } },
  { coverage: { ...commentPage().coverage, scope: "all_federal_documents" } },
  { coverage: { ...commentPage().coverage, asOf: "not-an-instant" } },
  { coverage: null },
  { data: [{ ...commentPage().data[0], date: "2026-02-30" }] },
  { data: [{ ...commentPage().data[0], dateKind: "effective" }] },
  { data: [{ ...commentPage().data[0], precision: "timestamp" }] },
  ...[
    { source: "other_source" },
    { sourceField: "effective_on" },
    { cachedField: "publicationDate" },
    { rawPublisherValueVerified: true },
  ].map((change) => ({
    data: [
      {
        ...commentPage().data[0],
        provenance: { ...commentPage().data[0]!.provenance, ...change },
      },
    ],
  })),
])(
  "rejects invalid native coverage or date authority with502: %j",
  async (change) => {
    const fixture = gateway({ ...commentPage(), ...change });
    expect((await fixture.execute()).status).toBe(502);
    expect(fixture.fetcher).toHaveBeenCalledTimes(1);
  },
);

it("retains empty accepted candidate pages and old failed unfinished ingestion without asserting freshness", async () => {
  const page = commentPage();
  const payload = {
    ...page,
    data: [],
    pagination: {
      totalCandidates: 3,
      returned: 0,
      excludedOnPage: 1,
      hasMoreCandidates: true,
    },
    coverage: {
      ...page.coverage,
      asOf: "2020-01-01T00:00:00.000Z",
      latestIngestion: {
        source: "sync-federal-register",
        startedAt: "2019-12-31T12:00:00.000Z",
        finishedAt: null,
        status: "failed",
        rowsUpdated: 0,
        errorCount: 4,
        stats: { synthetic: true },
      },
    },
  };
  const fixture = gateway(payload);
  const response = await fixture.execute();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(payload);
  expect(fixture.fetcher).toHaveBeenCalledTimes(1);
});

it("retains the distinct legacy next30days operation", () => {
  expect(capiroOperations["calendar.commentDeadlines"]).toMatchObject({
    service: "core",
    method: "GET",
    path: "/federal-register/upcoming-deadlines",
  });
});
