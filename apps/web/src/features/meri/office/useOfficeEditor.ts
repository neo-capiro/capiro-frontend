import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LibraryVersion } from "../../../shared/meri-documents/library-access";
import { officeDraftSelection } from "../../../shared/meri-office/draft-selection";
import { createOfficeEditorHost } from "../../../shared/meri-office/editor-host";
import { OfficeFrameHost } from "../../../shared/meri-office/frame-host";

/** Connect the mounted view to the existing account cache and session lifetime. */
export function useOfficeEditor(
  account: { tenantId: string; actorId: string },
  version: LibraryVersion,
  onClose: () => void,
) {
  const queries = useQueryClient(),
    container = useRef<HTMLDivElement>(null);
  const [host] = useState(() => {
    const origin = {
      conversationId: version.binding.conversationId,
      clientId:
        version.scopes[0]!.kind === "client"
          ? version.scopes[0]!.resourceId
          : null,
    };
    const recovery = officeDraftSelection(queries, {
      ...account,
      ...origin,
      versionId: version.versionId,
    });
    const frame = new OfficeFrameHost({
      container: () => container.current,
      callbacks: {
        ready: () => host.editor.ready(),
        modified: (value) => host.editor.modified(value),
        renew: () => {
          void host.session.connect();
        },
        unavailable: (reason) => host.editor.frameUnavailable(reason),
      },
    });
    const host = createOfficeEditorHost({
      account,
      origin,
      recovery,
      frame,
      onDiscarded: onClose,
    });
    return host;
  });
  useEffect(() => host.attach(), [host]);
  const state = useSyncExternalStore(
    host.editor.subscribe,
    host.editor.getSnapshot,
    host.editor.getSnapshot,
  );
  const connection = useSyncExternalStore(
    host.session.subscribe,
    host.session.getSnapshot,
    host.session.getSnapshot,
  );
  return { host, state, connection, container };
}
