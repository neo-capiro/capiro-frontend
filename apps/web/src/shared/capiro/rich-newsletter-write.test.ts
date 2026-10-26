import { it, expect, vi } from "vitest";
import {
  createNewsletterLayout,
  defaultNewsletterConfig,
} from "@capiro/shared/newsletter";
import { createCapiroApi } from "./http";
import { handleCapiroRequest } from "./gateway";
import {
  createRichNewsletterAdapter,
  RichNewsletterSaveRefused,
} from "./rich-newsletter";
import { richNewsletterOperations } from "./operations/rich-newsletter";

const requestId = "10000000-0000-4000-8000-000000000001";
const documentId = "20000000-0000-4000-8000-000000000001";
const body = () => ({
  requestId,
  revision: 4,
  name: "Synthetic save",
  design: createNewsletterLayout(1),
  config: defaultNewsletterConfig(),
});
const refusal = () => ({
  code: "NEWSLETTER_SAVE_CAS_REFUSED",
  disposition: "not_committed",
  requestId,
  operation: "save",
  documentId,
  previousRevision: 4,
});
const receipt = () => ({
  requestId,
  operation: "save",
  documentId,
  previousRevision: 4,
  revision: 5,
  inputHash: "a".repeat(64),
  contentHash: "b".repeat(64),
  hashFormat: "newsletter-write-jcs-v1",
  createdAt: "2026-10-26T00:00:00.000Z",
});
function chain(payload: unknown, status = 409) {
  const upstream = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json(payload, { status }));
  const fetcher: typeof fetch = async (url, init) =>
    handleCapiroRequest(
      new Request(new URL(String(url), "https://frontend.example.test"), {
        ...init,
        headers: { ...init?.headers, Origin: "https://frontend.example.test" },
      }),
      decodeURIComponent(
        new URL(String(url), "https://frontend.example.test").pathname
          .split("/")
          .pop()!,
      ),
      richNewsletterOperations,
      {
        services: { workspace: "https://workspace.example.test/api" },
        authConfigured: true,
        issues: [],
      },
      async () => "synthetic-test-token",
      upstream,
    );
  return {
    upstream,
    adapter: createRichNewsletterAdapter(
      createCapiroApi(richNewsletterOperations, { fetcher }),
    ),
  };
}
it("passes only the exact no-write refusal through gateway, HTTP and bound adapter", async () => {
  const { adapter, upstream } = chain(refusal());
  await expect(
    adapter.save(documentId, body(), new AbortController().signal),
  ).rejects.toMatchObject({ refusal: refusal() });
  expect(upstream).toHaveBeenCalledOnce();
});
it.each([
  null,
  { message: "Generic409" },
  { ...refusal(), requestId: documentId },
  { ...refusal(), documentId: requestId },
  { ...refusal(), previousRevision: 3 },
  { ...refusal(), authority: true },
])("keeps malformed or unmatched409 unknown: %j", async (payload) => {
  const { adapter, upstream } = chain(payload);
  try {
    await adapter.save(documentId, body(), new AbortController().signal);
    throw Error("Expected failure");
  } catch (error) {
    expect(error).not.toBeInstanceOf(RichNewsletterSaveRefused);
    expect(error).toMatchObject({
      status: 409,
      newsletterSaveRefusal: undefined,
    });
  }
  expect(upstream).toHaveBeenCalledOnce();
});
it("does not forward a valid rich refusal for the create operation or a non409", async () => {
  await expect(
    chain(refusal()).adapter.create(
      { requestId },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ status: 409, newsletterSaveRefusal: undefined });
  await expect(
    chain(refusal(), 503).adapter.save(
      documentId,
      body(),
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ status: 503, newsletterSaveRefusal: undefined });
});
it("receives a content-free exact receipt and GET-only replay with retained hash pins", async () => {
  const { adapter, upstream } = chain(receipt(), 200);
  expect(
    await adapter.save(documentId, body(), new AbortController().signal),
  ).toEqual(receipt());
  expect(
    await adapter.writeRequest(
      {
        requestId,
        operation: "save",
        documentId,
        previousRevision: 4,
        inputHash: "a".repeat(64),
        contentHash: "b".repeat(64),
      },
      new AbortController().signal,
    ),
  ).toEqual(receipt());
  expect(upstream.mock.calls.map(([, init]) => init?.method)).toEqual([
    "PATCH",
    "GET",
  ]);
  await expect(
    adapter.writeRequest(
      {
        requestId,
        operation: "save",
        documentId,
        previousRevision: 4,
        contentHash: "c".repeat(64),
      },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ status: 502 });
});
it("null read is absence only and mismatched mutation receipt fails without retry", async () => {
  expect(
    await chain(null, 200).adapter.writeRequest(
      { requestId, operation: "create" },
      new AbortController().signal,
    ),
  ).toBeNull();
  const { adapter, upstream } = chain(
    { ...receipt(), requestId: documentId },
    200,
  );
  await expect(
    adapter.save(documentId, body(), new AbortController().signal),
  ).rejects.toMatchObject({ status: 502 });
  expect(upstream).toHaveBeenCalledOnce();
});
