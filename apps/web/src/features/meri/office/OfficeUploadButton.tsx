"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import { createOfficeOriginalImport } from "../../../shared/meri-office/original-import";
import { OfficeEditor } from "./OfficeEditor";

/** The upload receipt offers an action; the service checks the retained original again. */
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
  const [host] = useState(() =>
    createOfficeOriginalImport({ context, selection, queries }),
  );
  const [showEditor, setShowEditor] = useState(false);
  useEffect(() => host.attach(), [host]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );
  return (
    <>
      <button
        type="button"
        disabled={state.busy}
        aria-label={`Open ${filename} in the Office editor`}
        onClick={() => {
          setShowEditor(true);
          void host.open();
        }}
      >
        {state.busy
          ? "Opening original…"
          : state.attempted && state.message
            ? "Check import"
            : "Open in editor"}
      </button>
      {state.message && <span role="status">{state.message}</span>}
      {showEditor && state.version && state.runId && (
        <OfficeEditor
          account={{ tenantId: context.tenantId, actorId: context.actorId }}
          version={state.version}
          sessionRunId={state.runId}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
