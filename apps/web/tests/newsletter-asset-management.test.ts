import { expect, it } from "vitest";
import { richNewsletterAssetManagementOperations as operations } from "../src/shared/capiro/operations/rich-newsletter-asset-management";
import {
  admitAssetChange,
  assetChangeInput,
} from "../src/features/modules/workspace/rich-newsletter/assets/asset-management";
import {
  asset,
  assetDetails,
  assetId,
  secondId,
} from "../test/browser/newsletter-assets-fixture";

const folder = {
  id: "30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Synthetic folder",
};
it("registers actual fixed management paths and keeps all requests bounded", () => {
  expect(
    Object.values(operations).map(({ method, path }) => [method, path]),
  ).toEqual([
    ["GET", "/newsletters/asset-folders"],
    ["POST", "/newsletters/asset-folders"],
    ["PATCH", "/newsletters/asset-folders/:id"],
    ["DELETE", "/newsletters/asset-folders/:id"],
    ["POST", "/newsletters/assets/move"],
    ["PATCH", "/newsletters/assets/:id"],
    ["POST", "/newsletters/assets/delete"],
    ["POST", "/newsletters/assets/import"],
    ["GET", "/newsletters/assets/:id/revisions"],
  ]);
  const create =
    operations["workspace.richNewsletter.assetFolders.create"].request;
  expect(
    create.parse(assetChangeInput({ kind: "createFolder" }, "  Briefings  ")),
  ).toEqual({ body: { name: "Briefings" } });
  for (const body of [
    { name: " " },
    { name: "x".repeat(101) },
    { name: "Valid", assetIds: [assetId] },
  ])
    expect(create.safeParse({ body }).success).toBe(false);
  const move = operations["workspace.richNewsletter.assets.move"].request;
  expect(
    move.parse(assetChangeInput({ kind: "moveImage", image: asset() }, "")),
  ).toEqual({ body: { ids: [assetId], folderId: null } });
  for (const body of [
    { ids: [], folderId: null },
    { ids: Array(101).fill(assetId), folderId: null },
    { ids: [assetId], folderId: "unfiled" },
    { ids: [assetId], folderId: null, ownerId: folder.id },
  ])
    expect(move.safeParse({ body }).success).toBe(false);
});
it("binds rename to captured identities and rejects a count for more than the selected image", () => {
  const folderAction = { kind: "renameFolder" as const, folder };
  expect(admitAssetChange(folderAction, { ...folder, name: "Renamed" })).toBe(
    true,
  );
  expect(admitAssetChange(folderAction, { ...folder, id: assetId })).toBe(
    false,
  );
  const imageAction = { kind: "renameImage" as const, image: asset() };
  expect(admitAssetChange(imageAction, asset())).toBe(true);
  expect(admitAssetChange(imageAction, asset(secondId))).toBe(false);
  for (const [kind, field] of [
    ["moveImage", "moved"],
    ["deleteImage", "deleted"],
  ] as const) {
    expect(admitAssetChange({ kind, image: asset() }, { [field]: 1 })).toBe(
      true,
    );
    for (const count of [0, 2, "1"])
      expect(
        admitAssetChange({ kind, image: asset() }, { [field]: count }),
      ).toBe(false);
  }
});
it("uses physical public shapes without inventing folder completeness or revision-root echoes", () => {
  const folders =
    operations["workspace.richNewsletter.assetFolders.list"].response;
  expect(folders.parse({ items: [folder] })).toEqual({ items: [folder] });
  expect(folders.safeParse({ items: [folder], complete: true }).success).toBe(
    false,
  );
  const revisions = operations["workspace.richNewsletter.assets.revisions"];
  expect(
    revisions.request.parse({
      params: { id: assetId },
      query: { page: 2, pageSize: 10 },
    }),
  ).toEqual({ params: { id: assetId }, query: { page: 2, pageSize: 10 } });
  const page = {
    page: 2,
    pageSize: 10,
    total: 11,
    items: [
      { ...assetDetails(secondId), currentRevision: false, revisionNumber: 1 },
    ],
  };
  expect(revisions.response.parse(page)).toEqual(page);
  expect(
    revisions.response.safeParse({ ...page, rootId: assetId }).success,
  ).toBe(false);
  expect(
    operations[
      "workspace.richNewsletter.assetFolders.delete"
    ].response.safeParse({ deleted: true, revoked: true }).success,
  ).toBe(false);
});
it("keeps import text inert, bounded and optional folder IDs distinct from query sentinels", () => {
  const request = operations["workspace.richNewsletter.assets.import"].request;
  const url = "https://images.example.test/synthetic.png";
  expect(request.parse(assetChangeInput({ kind: "importImage" }, url))).toEqual(
    { body: { url } },
  );
  expect(
    request.parse(assetChangeInput({ kind: "importImage", folder }, url)),
  ).toEqual({ body: { url, folderId: folder.id } });
  for (const body of [
    { url: "x".repeat(2049) },
    { url, folderId: "unfiled" },
    { url, fetch: true },
  ])
    expect(request.safeParse({ body }).success).toBe(false);
  expect(
    operations["workspace.richNewsletter.assets.import"].response.parse(
      asset(),
    ),
  ).toEqual(asset());
});
