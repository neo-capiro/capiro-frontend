import {
  StrictMode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import { OfficeEditorController } from "../../src/shared/meri-office/editor-controller";
import { OfficeFrameHost } from "../../src/shared/meri-office/frame-host";
import { OfficeDraftControls } from "../../src/features/modules/workspace/office/OfficeDraftControls";
import type { OfficeTransport } from "../../src/shared/meri-office/transport";
import type {
  OfficeResponseMap,
  OfficeRoute,
} from "@capiro/meri-contracts/office-application";
import { officeIds, officeWireSnapshot } from "../office-wire-fixture";
import "../../src/app/globals.css";
import styles from "../../src/features/modules/workspace/office/office-workspace.module.css";

/** The Workspace workbench's host side over a scripted office transport: CODE's own Save, Save As and close
 * controls arrive as frame messages and run the controller's confirmed sequences. No network, no CODE. */
function Harness() {
  const container = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [historyRequests, setHistoryRequests] = useState(0);
  const [owner] = useState(() => {
    let snapshot = officeWireSnapshot();
    const frame = new OfficeFrameHost({
      container: () => container.current,
      callbacks: {
        ready: () => editor.ready(),
        modified: (value) => editor.modified(value),
        renew: () => editor.bind({ ...port }),
        unavailable: (reason) => editor.frameUnavailable(reason),
        saveRequested: () => void editor.save(),
        saveAsRequested: () => void editor.publishRevision(),
        closeRequested: () => void editor.close(),
        historyRequested: () => setHistoryRequests((n) => n + 1),
      },
    });
    const port: OfficeTransport = {
      pending: () => false,
      dispose() {},
      async request<R extends OfficeRoute>(route: R) {
        setEvents((old) => [...old, route]);
        if (route === "launch" || route === "renew")
          snapshot = {
            ...snapshot,
            editor: {
              editorId: officeIds.editorId,
              epoch: 1,
              expiresAt: new Date(Date.now() + 120_000).toISOString(),
            },
          };
        // Every read answers a newer stored revision, as Core does after the CODE Save it confirms.
        if (route === "read")
          snapshot = {
            ...snapshot,
            draft: {
              ...snapshot.draft,
              sequence: snapshot.draft.sequence + 1,
              sha256: "b".repeat(64),
              byteLength: 40,
            },
          };
        if (route === "release")
          snapshot = {
            ...snapshot,
            editor: { ...snapshot.editor, editorId: null, expiresAt: null },
          };
        if (route === "publish")
          snapshot = {
            ...snapshot,
            draft: {
              ...snapshot.draft,
              state: "published",
              publishIntent: `office:${officeIds.draftId}:1`,
              publishedVersionId: officeIds.editorId,
            },
          };
        const expiresAtMs = Date.now() + 120_000;
        const launch = {
          edition: "collabora-code",
          editorOrigin: "https://office.example.test",
          actionUrl: `https://office.example.test/browser/test/cool.html?WOPISrc=${encodeURIComponent(`https://meri.example.test/api/meri/office/wopi/files/${officeIds.draftId}`)}`,
          method: "POST",
          fields: {
            access_token: `synthetic.${"a".repeat(43)}`,
            access_token_ttl: String(expiresAtMs),
          },
          expiresAtMs,
        };
        const value =
          route === "publish"
            ? {
                schema: snapshot.schema,
                draft: snapshot.draft,
                publication: {
                  version: { versionId: officeIds.editorId },
                  inspection: { format: "docx" },
                },
              }
            : route === "discard"
              ? { schema: snapshot.schema, discarded: true }
              : {
                  ...snapshot,
                  launch:
                    route === "launch" || route === "renew" ? launch : null,
                };
        return { status: 200, value: value as OfficeResponseMap[R] };
      },
    };
    const editor = new OfficeEditorController({
      selection: officeIds,
      frame,
      onPublished: (document) =>
        setEvents((old) => [
          ...old,
          `published:${document.version.versionId.slice(-4)}`,
        ]),
      onClosed: () => setEvents((old) => [...old, "closed"]),
    });
    return { editor, port };
  });
  useEffect(() => {
    owner.editor.bind(owner.port);
    return () => owner.editor.accessLost();
  }, [owner]);
  const state = useSyncExternalStore(
    owner.editor.subscribe,
    owner.editor.getSnapshot,
    owner.editor.getSnapshot,
  );
  return (
    <main style={{ padding: 24 }}>
      <h1>Office workbench</h1>
      <div className={styles.actions}>
        <OfficeDraftControls
          editor={owner.editor}
          state={state}
          readOnly={false}
        />
      </div>
      {state.busy && <p role="status">{state.busy}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
      {state.frame && !state.ready && <p role="status">Loading the editor…</p>}
      <div ref={container} className={styles.frame} hidden={!state.frame} />
      <button onClick={() => owner.editor.accessLost()}>
        Simulate account access loss
      </button>
      <button
        onClick={() => {
          owner.editor.suspend();
          owner.editor.bind({ ...owner.port });
        }}
      >
        Simulate native renewal
      </button>
      <output aria-label="Service operations">{events.join(",")}</output>
      <output aria-label="Retained view">{JSON.stringify(state)}</output>
      <output aria-label="History requests">{historyRequests}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
