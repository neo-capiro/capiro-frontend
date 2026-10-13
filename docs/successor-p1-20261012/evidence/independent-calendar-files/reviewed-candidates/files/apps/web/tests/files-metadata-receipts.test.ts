import { describe, expect, it } from "vitest";
import { fileChangeForIdSchema } from "../src/features/portfolio/files/contracts";
import { file } from "./browser/fixtures";

describe("reviewed single-file metadata receipts", () => {
  it("rejects a same-file receipt that did not restrict access", () => {
    const schema = fileChangeForIdSchema(file.id, {
      kind: "access",
      viewerMode: "restricted",
      viewerUserIds: [],
    });
    expect(schema.safeParse(file).success).toBe(false);
  });
  it("requires the exact restricted viewer set, rejecting missing and extra viewers", () => {
    const schema = fileChangeForIdSchema(file.id, {
      kind: "access",
      viewerMode: "restricted",
      viewerUserIds: ["viewer-a", "viewer-b"],
    });
    for (const ids of [["viewer-a"], ["viewer-a", "viewer-b", "viewer-c"]])
      expect(
        schema.safeParse({
          ...file,
          viewerMode: "restricted",
          viewerUserIds: ids,
        }).success,
      ).toBe(false);
  });
  it("compares normalized viewer sets independently of order", () => {
    const schema = fileChangeForIdSchema(file.id, {
      kind: "access",
      viewerMode: "restricted",
      viewerUserIds: [" viewer-b ", "viewer-a", "viewer-a", " "],
    });
    expect(
      schema.safeParse({
        ...file,
        viewerMode: "restricted",
        viewerUserIds: ["viewer-a", "viewer-b"],
      }).success,
    ).toBe(true);
  });
  it("compares all-mode semantically while still requiring its returned mode", () => {
    const schema = fileChangeForIdSchema(file.id, {
      kind: "access",
      viewerMode: "all",
      viewerUserIds: ["prior-viewer"],
    });
    expect(schema.safeParse(file).success).toBe(true);
    expect(
      schema.safeParse({ ...file, viewerMode: "restricted", viewerUserIds: [] })
        .success,
    ).toBe(false);
  });
  it("rejects an unchanged folder and accepts native normalized folder or unfiled", () => {
    const schema = fileChangeForIdSchema(file.id, {
      kind: "move",
      folder: "  Reviewed destination  ",
    });
    expect(schema.safeParse(file).success).toBe(false);
    expect(
      schema.safeParse({ ...file, folder: "Reviewed destination" }).success,
    ).toBe(true);
    expect(
      fileChangeForIdSchema(file.id, { kind: "move", folder: " " }).safeParse({
        ...file,
        folder: null,
      }).success,
    ).toBe(true);
  });
  it("keeps receipt identity binding even when the effect matches", () => {
    expect(
      fileChangeForIdSchema(file.id, {
        kind: "move",
        folder: "Reports",
      }).safeParse({ ...file, id: "60000000-0000-4000-8000-000000000009" })
        .success,
    ).toBe(false);
  });
});
