import {
  briefCopySourceSchema,
  type BriefCopyDetail,
} from "@/shared/capiro/operations/workspace-brief-copy";
import type { SavedSnapshotExport } from "@/shared/capiro/operations/workspace-exports";
import type { SavedVersion } from "@/shared/capiro/operations/workspace-documents";
import { canonicalJson } from "../version-history/version-history";
import { sameSource } from "./admission";

/** Current Core source access is server-owned; historical origin survives client conversion. */
export function assertSavedCopyVersion(
  version: SavedSnapshotExport,
  detail: BriefCopyDetail,
  versionId: string,
) {
  if (
    version.tenantId !== detail.tenantId ||
    version.id !== versionId ||
    !copyPresentInVersion(version, detail)
  )
    throw new Error(
      "This saved version does not match the selected prospect, source and copied tab.",
    );
  return version;
}

export function copyPresentInVersion(
  version: SavedVersion,
  detail: BriefCopyDetail,
) {
  const documents = version.snapshot?.documents?.filter(
    (document) => document.id === detail.document.id,
  );
  const source = briefCopySourceSchema.safeParse(
    documents?.[0]?.sourceBriefVersion,
  );
  return (
    version.draftId === detail.draftId &&
    version.snapshot?.prospectId === detail.prospectId &&
    documents?.length === 1 &&
    source.success &&
    sameSource(source.data, detail.document.sourceBriefVersion)
  );
}

/** A successful fresh read is required at download time; no live body can replace the inspected snapshot. */
export async function readInspectedCopyForDownload(
  selected: SavedSnapshotExport,
  detail: BriefCopyDetail,
  read: () => Promise<SavedSnapshotExport>,
) {
  const fresh = assertSavedCopyVersion(await read(), detail, selected.id);
  if (canonicalJson(fresh) !== canonicalJson(selected))
    throw new Error(
      "The selected saved version changed. Inspect it again before downloading.",
    );
  return new Blob([JSON.stringify(fresh, null, 2) + "\n"], {
    type: "application/json",
  });
}
