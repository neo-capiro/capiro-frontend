import { expect, it } from "vitest";
import {
  richNewsletterAssetOperations as operations,
  assetUploadPolicy,
} from "../src/shared/capiro/operations/rich-newsletter-assets";
import { boundAssetDetails } from "../src/features/modules/workspace/rich-newsletter/assets/use-asset-picker";
import { assetFileError } from "../src/features/modules/workspace/rich-newsletter/assets/use-asset-upload";
import {
  backendMultipart,
  validateUploadFiles,
} from "../src/shared/capiro/multipart";

const id = "10000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const item = {
  id,
  name: "",
  mimeType: "image/png",
  url: `https://assets.example.test/workspace-api/newsletters/assets/file/${"a".repeat(64)}`,
};
const details = {
  ...item,
  createdAt: "2026-10-26T09:00:00.000Z",
  sizeBytes: 8,
  revisionNumber: 1,
  currentRevision: true,
};
const query = { page: 2, pageSize: 25, search: "Policy", sort: "newest" };
const list = operations["workspace.richNewsletter.assets.list"];
const detail = operations["workspace.richNewsletter.assets.detail"];
const upload = operations["workspace.richNewsletter.assets.upload"];

it("registers only three current owned-image paths with actual query limits", () => {
  expect(
    Object.values(operations).map(({ method, path, service }) => [
      method,
      path,
      service,
    ]),
  ).toEqual([
    ["GET", "/newsletters/assets", "workspace"],
    ["GET", "/newsletters/assets/:id", "workspace"],
    ["POST", "/newsletters/assets", "workspace"],
  ]);
  expect(list.request.parse({ query })).toEqual({ query });
  for (const change of [
    { page: 0 },
    { page: 100001 },
    { pageSize: 20 },
    { search: "x".repeat(201) },
    { sort: "invalid" },
    { folder: "unfiled" },
    { ownerId: id },
    { clientId: id },
  ])
    expect(
      list.request.safeParse({ query: { ...query, ...change } }).success,
    ).toBe(false);
  expect(detail.request.safeParse({ params: { id } }).success).toBe(true);
  for (const invalid of [
    "a".repeat(64),
    item.url,
    "00000000-0000-0000-0000-000000000000",
  ])
    expect(detail.request.safeParse({ params: { id: invalid } }).success).toBe(
      false,
    );
});
it("uses the physical public receiver and preserves paged and empty-name facts", () => {
  const page = { page: 2, pageSize: 25, total: 31, items: [item] };
  expect(list.response.parse(page)).toEqual(page);
  expect(upload.response.parse(item)).toEqual(item);
  expect(list.response.safeParse({ ...page, complete: true }).success).toBe(
    false,
  );
  expect(upload.response.safeParse({ ...item, requestId: id }).success).toBe(
    false,
  );
  expect(upload.response.safeParse(null).success).toBe(false);
});
it("keeps transport details unknown until the captured UUID passes public admission", () => {
  const raw: unknown = detail.response.parse(details);
  expect(boundAssetDetails(raw, id)).toEqual({ ok: true, value: details });
  expect(boundAssetDetails(raw, id.replace("10000000", "20000000"))).toEqual({
    ok: false,
    error: { code: "identity_mismatch", path: "$.id" },
  });
  expect(boundAssetDetails({ ...details, dimensions: "invented" }, id).ok).toBe(
    false,
  );
  expect(boundAssetDetails(null, id).ok).toBe(false);
  expect(boundAssetDetails({ ...details, currentRevision: false }, id)).toEqual(
    { ok: true, value: { ...details, currentRevision: false } },
  );
});
it("bounds the existing one-file multipart owner and rejects local invalid files before upload", () => {
  const file = new File([new Uint8Array(8)], "synthetic.png", {
    type: "image/png",
  });
  const files = [{ field: "file", file }];
  expect(upload.encoding).toBe("multipart");
  expect(upload.multipart).toBe(assetUploadPolicy);
  expect(assetFileError(file)).toBeUndefined();
  for (const invalid of [
    undefined,
    new File([], "empty.png", { type: "image/png" }),
    new File(["x"], "bad.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    }),
  ])
    expect(assetFileError(invalid)).toContain("Not uploaded");
  expect(() =>
    validateUploadFiles([...files, ...files], assetUploadPolicy),
  ).toThrow();
  expect(upload.request.safeParse({ body: { folderId: id } }).success).toBe(
    false,
  );
  expect([
    ...backendMultipart({ body: {} }, files, assetUploadPolicy).keys(),
  ]).toEqual(["file"]);
});
