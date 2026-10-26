import { expect, it, vi } from "vitest";
import { richNewsletterStockOperations as stock } from "../src/shared/capiro/operations/rich-newsletter-stock";
import {
  richNewsletterProviderOperations as tools,
  imageToolPolicy,
} from "../src/shared/capiro/operations/rich-newsletter-providers";
import {
  backendMultipart,
  validateUploadFiles,
} from "../src/shared/capiro/multipart";
import { createCapiroApi } from "../src/shared/capiro/http";

const id = "10000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const params = { id };
it("registers only the existing stock paths with closed search and import requests", () => {
  expect(
    Object.values(stock).map(({ method, path }) => [method, path]),
  ).toEqual([
    ["GET", "/newsletters/stock-images/status"],
    ["GET", "/newsletters/stock-images"],
    ["POST", "/newsletters/stock-images/:id/import"],
  ]);
  const search = stock["workspace.richNewsletter.stock.search"].request;
  expect(
    search.safeParse({ query: { search: "s".repeat(100), page: 10_000 } })
      .success,
  ).toBe(true);
  for (const query of [
    { search: "s".repeat(101), page: 1 },
    { search: "", page: 0 },
    { search: "", page: 1, pageSize: 25 },
    { search: "", page: 1, url: "https://attacker.test" },
  ])
    expect(search.safeParse({ query }).success).toBe(false);
  const post = stock["workspace.richNewsletter.stock.import"].request;
  expect(post.safeParse({ params: { id: "123" }, body: {} }).success).toBe(
    true,
  );
  for (const input of [
    { params: { id: "123" }, body: { url: "https://attacker.test" } },
    { params: { id: "1000000000000000" }, body: {} },
    { params: { id: "../123" }, body: {} },
  ])
    expect(post.safeParse(input).success).toBe(false);
});

it("keeps provider requests on the actual document routes and preserves the real input limits", () => {
  expect(
    Object.values(tools).map(({ method, path }) => [method, path]),
  ).toEqual([
    ["GET", "/newsletters/capabilities"],
    ["POST", "/newsletters/documents/:id/write"],
    ["POST", "/newsletters/documents/:id/generate-alt-text"],
    ["POST", "/newsletters/documents/:id/refine-image"],
    ["POST", "/newsletters/documents/:id/html-check"],
    ["POST", "/newsletters/documents/:id/video-thumbnail"],
    ["POST", "/newsletters/documents/:id/link-preview"],
  ]);
  const write = tools["workspace.richNewsletter.write"].request;
  expect(
    write.safeParse({
      params,
      body: {
        prompt: "p".repeat(4000),
        text: "t".repeat(30_000),
        kind: "paragraph",
      },
    }).success,
  ).toBe(true);
  expect(
    write.safeParse({
      params,
      body: { prompt: "p", text: "t".repeat(30_001), kind: "paragraph" },
    }).success,
  ).toBe(false);
  const refine = tools["workspace.richNewsletter.refineImage"].request;
  expect(
    refine.safeParse({
      params,
      body: { prompt: "Refine", count: 4, sourceToken: "a".repeat(64) },
    }).success,
  ).toBe(true);
  for (const body of [
    { prompt: "Refine", count: 2 },
    { prompt: "Refine", count: 1, sourceToken: "../file" },
    { prompt: "Refine", count: 1, sourceUrl: "https://attacker.test" },
  ])
    expect(refine.safeParse({ params, body }).success).toBe(false);
  expect(
    tools["workspace.richNewsletter.htmlCheck"].request.safeParse({
      params,
      body: { revision: 0 },
    }).success,
  ).toBe(false);
  expect(
    tools["workspace.richNewsletter.videoThumbnail"].request.safeParse({
      params,
      body: { url: "x".repeat(2049) },
    }).success,
  ).toBe(false);
});

it("uses the existing bounded multipart owner for image bytes or an explicit resource token", () => {
  const file = new File([new Uint8Array([137, 80, 78, 71])], "synthetic.png", {
    type: "image/png",
  });
  expect(() =>
    validateUploadFiles([{ field: "file", file }], imageToolPolicy),
  ).not.toThrow();
  for (const files of [
    [
      {
        field: "file",
        file: new File(["GIF"], "synthetic.gif", { type: "image/gif" }),
      },
    ],
    [
      {
        field: "file",
        file: new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", {
          type: "image/png",
        }),
      },
    ],
    [
      { field: "file", file },
      { field: "file", file },
    ],
  ])
    expect(() => validateUploadFiles(files, imageToolPolicy)).toThrow();
  const form = backendMultipart(
    {
      body: {
        sourceToken: "a".repeat(64),
        prompt: "Synthetic instruction",
        count: 4,
      },
    },
    [],
    imageToolPolicy,
  );
  expect([...form.entries()]).toEqual([
    ["sourceToken", "a".repeat(64)],
    ["prompt", "Synthetic instruction"],
    ["count", "4"],
  ]);
});

it("receives real public capability and proposal contracts without admitting invented authority", () => {
  const unavailable = { available: false, reason: "Synthetic unavailable" };
  const capabilities = {
    ai: unavailable,
    imageAi: unavailable,
    altTextAi: unavailable,
    htmlCheck: unavailable,
    inboxPreview: unavailable,
    send: unavailable,
  };
  expect(
    tools["workspace.richNewsletter.capabilities"].response.parse(capabilities),
  ).toEqual(capabilities);
  expect(
    tools["workspace.richNewsletter.capabilities"].response.safeParse({
      ...capabilities,
      send: { available: true, reason: null },
    }).success,
  ).toBe(false);
  expect(
    tools["workspace.richNewsletter.write"].response.parse({
      text: "<script>inert text</script>",
    }),
  ).toEqual({ text: "<script>inert text</script>" });
  expect(
    tools["workspace.richNewsletter.altText"].response.safeParse({
      text: "x".repeat(501),
    }).success,
  ).toBe(false);
  expect(
    tools["workspace.richNewsletter.linkPreview"].response.parse({
      sourceUrl: "https://redirected.example.test/",
      title: "",
      description: "",
      imageUrl: "",
      warnings: ["Text preview only"],
    }).imageUrl,
  ).toBe("");
  expect(
    stock["workspace.richNewsletter.stock.import"].response.safeParse({
      id,
      currentRevision: true,
      photoId: 123,
    }).success,
  ).toBe(false);
});

it("does not repeat uncertain provider/import requests or admit a cancelled response", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ text: "" }));
  const api = createCapiroApi(tools, { fetcher });
  await expect(
    api.request("workspace.richNewsletter.write", {
      params,
      body: { prompt: "Summarize", text: "Source", kind: "paragraph" },
    }),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const aborted = new AbortController();
  fetcher.mockImplementation(async () => {
    aborted.abort();
    return Response.json({ text: "Late text" });
  });
  await expect(
    api.request(
      "workspace.richNewsletter.write",
      {
        params,
        body: { prompt: "Summarize", text: "Source", kind: "paragraph" },
      },
      { signal: aborted.signal },
    ),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(2);
  const stockFetch = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ id }, { status: 200 }));
  await expect(
    createCapiroApi(stock, { fetcher: stockFetch }).request(
      "workspace.richNewsletter.stock.import",
      { params: { id: "123" }, body: {} },
    ),
  ).rejects.toThrow();
  expect(stockFetch).toHaveBeenCalledTimes(1);
});
