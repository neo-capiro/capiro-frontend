import { expect, it } from "vitest";
import {
  folderAccessForChangeSchema,
  normalizeFolderAccess,
} from "../src/features/portfolio/files/contracts";
import { change, receipt } from "./acceptance-folder-access-fixtures";

it.each([
  { updated: 1 },
  { ...receipt, folder: "Other" },
  { ...receipt, folder: null },
  { ...receipt, viewerMode: "all" },
  { ...receipt, viewerUserIds: ["viewer-a"] },
  { ...receipt, viewerUserIds: ["viewer-a", "viewer-b", "viewer-c"] },
  { ...receipt, updated: -1 },
  { ...receipt, updated: 0.5 },
  { ...receipt, updated: Number.MAX_SAFE_INTEGER + 1 },
])(
  "rejects a folder acknowledgment without the exact supported effect: %j",
  (value) => {
    expect(folderAccessForChangeSchema(change()).safeParse(value).success).toBe(
      false,
    );
  },
);

it("admits normalized folder/restricted-set equivalence with zero count", () => {
  const intent = {
    ...change(),
    folder: " Reports ",
    viewerUserIds: [" viewer-b ", "viewer-a", "viewer-a", " "],
  };
  expect(
    folderAccessForChangeSchema(intent).parse({ ...receipt, updated: 0 }),
  ).toEqual({ ...receipt, updated: 0 });
  expect(normalizeFolderAccess(intent)).toEqual({
    ...change(),
    viewerUserIds: ["viewer-a", "viewer-b"],
  });
});

it("all-mode drops obsolete selected viewers, while its native receipt still returns the empty set", () => {
  const intent = { ...change(), viewerMode: "all" as const, folder: " " };
  expect(normalizeFolderAccess(intent)).toEqual({
    kind: "folder-access",
    folder: null,
    viewerMode: "all",
    viewerUserIds: [],
  });
  expect(
    folderAccessForChangeSchema(intent).safeParse({
      folder: null,
      viewerMode: "all",
      viewerUserIds: [],
      updated: 0,
    }).success,
  ).toBe(true);
  expect(
    folderAccessForChangeSchema(intent).safeParse({
      ...receipt,
      folder: null,
      viewerMode: "all",
    }).success,
  ).toBe(false);
});
