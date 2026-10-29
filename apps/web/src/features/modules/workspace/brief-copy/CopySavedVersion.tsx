"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { createRequestLifetime } from "@/shared/session/request-lifetime";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "@/shared/capiro/queries";
import type { BriefCopyDetail } from "@/shared/capiro/operations/workspace-brief-copy";
import type { SavedSnapshotExport } from "@/shared/capiro/operations/workspace-exports";
import { ActionButton, StatusPanel } from "@/shared/module-ui";
import { SavedVersionDetail } from "../version-history/SavedVersionDetail";
import {
  assertSavedCopyVersion,
  readInspectedCopyForDownload,
} from "./saved-copy-version";

function CopySnapshotDownload({
  detail,
  selected,
}: {
  detail: BriefCopyDetail;
  selected: SavedSnapshotExport;
}) {
  const api = useCapiro();
  const [lifetime] = useState(createRequestLifetime);
  useLayoutEffect(() => lifetime.mount(), [lifetime]);
  const input = { params: { draftId: detail.draftId, versionId: selected.id } };
  const [pending, setPending] = useState(false),
    [failure, setFailure] = useState("");
  const working = useRef(false);
  async function download() {
    if (working.current) return;
    const signal = lifetime.signal();
    working.current = true;
    setPending(true);
    setFailure("");
    try {
      const blob = await readInspectedCopyForDownload(selected, detail, () =>
        api.request("workspace.draft.savedSnapshot", input, { signal }),
      );
      signal.throwIfAborted();
      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      try {
        anchor.href = url;
        anchor.download = "workspace-saved-version.json";
        document.body.append(anchor);
        anchor.click();
      } finally {
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (error) {
      if (signal.aborted) return;
      setFailure(
        error instanceof Error
          ? error.message
          : "Snapshot download unavailable.",
      );
    } finally {
      working.current = false;
      if (!signal.aborted) setPending(false);
    }
  }
  return (
    <>
      <ActionButton disabled={pending} onClick={() => void download()}>
        {pending
          ? "Checking saved version…"
          : "Download inspected version JSON"}
      </ActionButton>
      {failure && <p role="alert">{failure}</p>}
    </>
  );
}

export function CopySavedVersion({
  detail,
  versionId,
}: {
  detail: BriefCopyDetail;
  versionId: string;
}) {
  const query = useCapiroQuery("workspace.draft.savedSnapshot", {
    params: { draftId: detail.draftId, versionId },
  });
  let selected: SavedSnapshotExport | undefined, refusal: Error | undefined;
  if (query.data && !query.loading && !query.error) {
    try {
      selected = assertSavedCopyVersion(query.data, detail, versionId);
    } catch (error) {
      refusal =
        error instanceof Error
          ? error
          : new Error("Saved version unavailable.");
    }
  }
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error ?? refusal}
      onRetry={query.reload}
    >
      {selected && (
        <>
          <SavedVersionDetail version={selected} />
          <details>
            <summary>Complete saved JSON and source provenance</summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(selected.snapshot, null, 2)}
            </pre>
          </details>
          <p>
            This is the complete saved Workspace draft, including other tabs.
            Rich fields and original source evidence remain unchanged in the
            JSON download. Historical PDF/DOCX rendering is unavailable.
          </p>
          <CopySnapshotDownload detail={detail} selected={selected} />
        </>
      )}
    </StatusPanel>
  );
}
