"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import { createOfficeOriginalImport } from "../../../shared/meri-office/original-import";
import { workspaceHref } from "../../modules/workspace/workspace-route";

/** The upload receipt offers an action; the service checks the retained original again, and the
 * imported version opens in the Workspace editor under the run that imported it. */
export function OfficeUploadButton({
  context,
  selection,
  filename,
}: {
  context: ConversationContext;
  selection: { uploadId: string; sha256: string };
  filename: string;
}) {
  const queries = useQueryClient();
  const router = useRouter();
  const [host] = useState(() =>
    createOfficeOriginalImport({ context, selection, queries }),
  );
  useEffect(() => host.attach(), [host]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!state.version || !state.runId) return;
    if (opened.current === state.version.versionId) return;
    opened.current = state.version.versionId;
    router.push(
      workspaceHref({
        kind: "office",
        versionId: state.version.versionId,
        conversationId: state.version.binding.conversationId,
        runId: state.runId,
        ...(context.selectedClientId
          ? { clientId: context.selectedClientId }
          : {}),
      }),
    );
  }, [state.version, state.runId, router, context.selectedClientId]);
  return (
    <>
      <button
        type="button"
        disabled={state.busy}
        aria-label={`Open ${filename} in the Workspace`}
        onClick={() => void host.open()}
      >
        {state.busy
          ? "Opening original…"
          : state.attempted && state.message
            ? "Check import"
            : "Open in Workspace"}
      </button>
      {state.message && <span role="status">{state.message}</span>}
    </>
  );
}
