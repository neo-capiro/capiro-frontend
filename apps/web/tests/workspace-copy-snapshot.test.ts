import { describe, expect, it, vi } from "vitest";
import {
  savedSnapshotExport,
  workspaceExportOperations,
} from "../src/shared/capiro/operations/workspace-exports";
import {
  assertSavedCopyVersion,
  copyPresentInVersion,
  readInspectedCopyForDownload,
} from "../src/features/modules/workspace/brief-copy/saved-copy-version";
import { copyDetail, copyIds } from "./workspace-brief-copy-fixtures";
import { copySnapshot } from "./workspace-copy-snapshot-fixture";

describe("copied saved snapshot export", () => {
  it("preserves the entire rich snapshot and provenance through the receiving schema", async () => {
    const expected = copySnapshot();
    const selected = savedSnapshotExport.parse(expected);
    expect(selected).toEqual(expected);
    const read = vi.fn(async () => selected);
    const current = structuredClone(copyDetail);
    current.document.body = {
      blocks: [{ id: "new", type: "section", content: "Current unsaved text" }],
    };
    const blob = await readInspectedCopyForDownload(selected, current, read);
    expect(read).toHaveBeenCalledTimes(1);
    expect(blob.type).toBe("application/json");
    expect(JSON.parse(await blob.text())).toEqual(expected);
    expect(await blob.text()).not.toContain("Current unsaved text");
  });
  it("retains the historical prospect origin after conversion to a client", () => {
    expect(
      assertSavedCopyVersion(
        copySnapshot(),
        { ...copyDetail, clientId: copyIds.other },
        copyIds.request,
      ),
    ).toEqual(copySnapshot());
  });
  it.each([
    "tenant",
    "draft",
    "version",
    "prospect",
    "document",
    "source",
    "duplicate",
  ] as const)("refuses a mismatched %s", (field) => {
    const version = copySnapshot();
    if (field === "tenant") version.tenantId = copyIds.other;
    if (field === "draft") version.draftId = copyIds.other;
    if (field === "version") version.id = copyIds.other;
    if (field === "prospect") version.snapshot!.prospectId = copyIds.other;
    if (field === "document")
      version.snapshot!.documents![0]!.id = copyIds.other;
    if (field === "source")
      version.snapshot!.documents![0]!.sourceBriefVersion = {
        ...copyDetail.document.sourceBriefVersion,
        snapshotHash: "e".repeat(64),
      };
    if (field === "duplicate")
      version.snapshot!.documents!.push(version.snapshot!.documents![0]!);
    expect(() =>
      assertSavedCopyVersion(version, copyDetail, copyIds.request),
    ).toThrow("does not match");
  });
  it("disables versions from before the copied tab existed", () => {
    const version = copySnapshot();
    version.snapshot!.documents = [];
    expect(copyPresentInVersion(version, copyDetail)).toBe(false);
  });
  it("refuses a changed saved snapshot instead of downloading a substitute", async () => {
    const selected = copySnapshot(),
      changed = copySnapshot();
    changed.snapshot!.docTitle = "Unexpected replacement";
    await expect(
      readInspectedCopyForDownload(selected, copyDetail, async () => changed),
    ).rejects.toThrow("changed");
  });
  it("does not fall back to inspected content after current access is refused", async () => {
    await expect(
      readInspectedCopyForDownload(copySnapshot(), copyDetail, async () => {
        throw new Error("Access revoked");
      }),
    ).rejects.toThrow("Access revoked");
  });
  it("accepts only a GET bound to exact draft/version IDs, with no body or missing snapshot", () => {
    const operation =
      workspaceExportOperations["workspace.draft.savedSnapshot"];
    const input = {
      params: { draftId: copyIds.draft, versionId: copyIds.request },
    };
    expect(operation.method).toBe("GET");
    expect(operation.request.parse(input)).toEqual(input);
    expect(
      operation.request.safeParse({ ...input, body: { restore: true } })
        .success,
    ).toBe(false);
    const missing = copySnapshot();
    delete missing.snapshot;
    expect(savedSnapshotExport.safeParse(missing).success).toBe(false);
  });
});
