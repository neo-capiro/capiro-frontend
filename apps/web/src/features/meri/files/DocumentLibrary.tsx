"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { DocumentPreviewPanel } from "./DocumentPreviewPanel";
import { DocumentRevisionLink } from "./DocumentRevisionLink";
import { Button } from "@capiro/ui/button";
import type { ConversationListPage } from "../../../shared/meri-conversations/history-client";
import {
  bootstrapLibrarySession,
  libraryOriginClient,
  listLibraryContexts,
} from "../../../shared/meri-documents/library-session";
import {
  createDocumentLibraryAccess,
  type DocumentLibraryAccess,
  type LibraryScope,
  type LibraryVersion,
} from "../../../shared/meri-documents/library-access";
import { SessionLifetimeController } from "../../../shared/meri-actions/opaque-session-controller";
import { DocumentLibraryController } from "./document-library-state";
import styles from "./files.module.css";

type Account = { tenantId: string; actorId: string };
type Origin = { conversationId: string; clientId: string | null };

/** Opens saved contexts only; no conversation or run is created to browse retained files. */
export function DocumentLibrary({
  account,
  clientId,
}: {
  account: Account;
  clientId?: string;
}) {
  const [rows, setRows] = useState<ConversationListPage["conversations"]>([]);
  const [before, setBefore] =
    useState<ConversationListPage["nextBefore"]>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  async function load() {
    if (busy || (loaded && before === null)) return;
    const current = new AbortController();
    request.current = current;
    setBusy(true);
    setProblem(null);
    try {
      const page = await listLibraryContexts({
        account,
        ...(clientId ? { clientId } : {}),
        before,
        signal: current.signal,
      });
      if (current.signal.aborted) return;
      if (
        (page.nextBefore !== null &&
          JSON.stringify(page.nextBefore) === JSON.stringify(before)) ||
        page.conversations.some((row) =>
          rows.some((old) => old.conversationId === row.conversationId),
        )
      )
        throw Error("Repeated discovery page");
      setRows([...rows, ...page.conversations]);
      setBefore(page.nextBefore);
      setLoaded(true);
    } catch {
      if (!current.signal.aborted) {
        setRows([]);
        setOrigin(null);
        setBefore(null);
        setLoaded(false);
        setProblem(
          "Saved conversations could not be verified. Try loading them again.",
        );
      }
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className={styles.files} aria-label="Saved file library">
      <h2>Saved files and version history</h2>
      <p className={styles.muted}>
        Choose a saved conversation to browse your currently available files.
        Opening this library does not start a chat or generate a file.
      </p>
      <div className={styles.controls}>
        <Button
          variant="outline"
          disabled={busy || (loaded && before === null)}
          onClick={() => void load()}
        >
          {busy
            ? "Loading…"
            : loaded
              ? "More saved conversations"
              : "Load saved conversations"}
        </Button>
        {rows.length > 0 && (
          <label className={styles.field}>
            <span>Saved conversation</span>
            <select
              value={origin?.conversationId ?? ""}
              onChange={(event) => {
                const row = rows.find(
                  (item) => item.conversationId === event.target.value,
                );
                setOrigin(
                  row
                    ? {
                        conversationId: row.conversationId,
                        clientId: libraryOriginClient(row, account),
                      }
                    : null,
                );
              }}
            >
              <option value="">Choose a conversation</option>
              {rows.map((row) => (
                <option key={row.conversationId} value={row.conversationId}>
                  Conversation {new Date(row.createdAt).toLocaleString()} ·{" "}
                  {row.conversationId.slice(-8)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {problem && <p role="status">{problem}</p>}
      {loaded && rows.length === 0 && (
        <p role="status">
          {before === null
            ? "No saved conversation is available in this scope."
            : "No matching conversation on this page. Continue loading to check later pages."}
        </p>
      )}
      {origin && (
        <LibraryConnection
          key={JSON.stringify(origin)}
          account={account}
          origin={origin}
        />
      )}
    </section>
  );
}

function LibraryConnection({
  account,
  origin,
  anchor,
}: {
  account: Account;
  origin: Origin;
  anchor?: LibraryVersion;
}) {
  const [host] = useState(
    () =>
      new SessionLifetimeController({
        issue: (signal) =>
          bootstrapLibrarySession({ account, ...origin, signal }),
        createPort: ({ session, signal, onAccessLost }) =>
          createDocumentLibraryAccess({
            credential: session.credential,
            context: session.context,
            lifetime: signal,
            onAccessLost,
          }),
        busy: (port: DocumentLibraryAccess) => port.pending(),
      }),
  );
  useEffect(() => {
    const detach = host.attach();
    void host.connect();
    return detach;
  }, [host]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );
  if (state.status === "ready")
    return (
      <LibraryPages
        key={state.lifetimeKey}
        port={state.port}
        account={account}
        {...(anchor ? { anchor } : {})}
      />
    );
  return (
    <section
      className={styles.panel}
      aria-label={
        anchor ? "Version history connection" : "File library connection"
      }
    >
      <p role="status">
        {state.status === "idle" || state.status === "connecting"
          ? "Checking current file access…"
          : "Current file access is unavailable. Previously loaded details have been cleared."}
      </p>
      {state.status !== "idle" && state.status !== "connecting" && (
        <Button variant="outline" onClick={() => void host.connect()}>
          Check access again
        </Button>
      )}
    </section>
  );
}

function LibraryPages({
  port,
  account,
  anchor,
}: {
  port: DocumentLibraryAccess;
  account: Account;
  anchor?: LibraryVersion;
}) {
  const [scope, setScope] = useState<LibraryScope>(
    port.context.selectedClientId === null ? "owner" : "client",
  );
  const [selected, setSelected] = useState<LibraryVersion | null>(null);
  return (
    <>
      {!anchor && (
        <label className={styles.field}>
          <span>Files to show</span>
          <select
            value={scope}
            onChange={(event) => {
              setSelected(null);
              setScope(event.target.value as LibraryScope);
            }}
          >
            <option value="conversation">This conversation</option>
            <option
              value="client"
              disabled={port.context.selectedClientId === null}
            >
              This client
            </option>
            <option value="owner">My files</option>
          </select>
        </label>
      )}
      <LibraryPage
        key={anchor?.versionId ?? scope}
        port={port}
        query={anchor ? { anchor } : { scope }}
        onHistory={setSelected}
      />
      {!anchor && selected && (
        <LibraryConnection
          key={selected.versionId}
          account={account}
          anchor={selected}
          origin={{
            conversationId: selected.binding.conversationId,
            clientId:
              selected.scopes[0]!.kind === "client"
                ? selected.scopes[0]!.resourceId
                : null,
          }}
        />
      )}
    </>
  );
}

function LibraryPage({
  port,
  query,
  onHistory,
}: {
  port: DocumentLibraryAccess;
  query: { scope: LibraryScope } | { anchor: LibraryVersion };
  onHistory: (version: LibraryVersion) => void;
}) {
  const [controller] = useState(
    () => new DocumentLibraryController(port, query),
  );
  useLayoutEffect(() => controller.attach(), [controller]);
  useEffect(() => {
    void controller.loadMore();
  }, [controller]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const history = "anchor" in query;
  return (
    <section
      className={styles.panel}
      aria-label={
        history ? "Immutable version history" : "File library results"
      }
    >
      <h3>{history ? `Version history: ${query.anchor.filename}` : "Files"}</h3>
      {state.problem && <p role="status">{state.problem}</p>}
      {state.problem && (
        <Button
          variant="outline"
          disabled={state.busy}
          onClick={() => void controller.reload()}
        >
          Reload {history ? "history" : "files"}
        </Button>
      )}
      {state.versions.length > 0 && (
        <ul className={styles.stack}>
          {state.versions.map((version) => (
            <li key={version.versionId}>
              <Button
                variant="outline"
                className={styles.button}
                disabled={state.busy}
                onClick={() =>
                  history ? controller.select(version) : onHistory(version)
                }
              >
                {version.filename} ·{" "}
                {new Date(version.createdAt).toLocaleString()}
              </Button>
              <p className={styles.muted}>
                {version.mimeType} · {version.object.bytes} bytes
                {history && version.parentVersionId === null
                  ? " · Original version"
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {state.loaded && state.versions.length === 0 && (
        <p role="status">
          {state.nextCursor === null
            ? "No files are currently available in this scope."
            : "No available files on this page. Continue to check later pages."}
        </p>
      )}
      {state.nextCursor !== null && (
        <Button
          variant="outline"
          disabled={state.busy}
          onClick={() => void controller.loadMore()}
        >
          Load more {history ? "versions" : "files"}
        </Button>
      )}
      {state.busy && <p role="status">Checking current file access…</p>}
      {state.loaded &&
        state.nextCursor === null &&
        state.versions.length > 0 && (
          <p className={styles.muted}>
            End of the currently available{" "}
            {history ? "version history" : "library"}.
          </p>
        )}
      {history && state.selected && (
        <div className={styles.stack}>
          <p className={styles.identifier}>
            Selected version: {state.selected.versionId}
          </p>
          <div className={styles.controls}>
            <Button
              variant="outline"
              disabled={state.busy}
              onClick={() => void controller.inspect()}
            >
              Inspect version
            </Button>
            <Button
              variant="outline"
              disabled={state.busy}
              onClick={() => void controller.download()}
            >
              Verify download
            </Button>
          </div>
          {state.inspection && (
            <p role="status">
              Current bytes verified for {state.inspection.filename}. This
              inspection does not claim a rendered preview.
            </p>
          )}
          {state.inspection?.kind === "generated" && (
            <>
              <DocumentPreviewPanel
                key={state.selected.versionId}
                port={port}
                versionId={state.selected.versionId}
              />
              {state.selected.versionId === state.versions[0]?.versionId ? (
                <DocumentRevisionLink
                  key={`revision:${state.selected.versionId}`}
                  port={port}
                  versionId={state.selected.versionId}
                />
              ) : (
                <p>
                  Select the latest version to revise. Earlier versions remain
                  available to inspect and download.
                </p>
              )}
            </>
          )}
          {state.download && (
            <a
              className={styles.download}
              href={state.download.url}
              download={state.download.filename}
            >
              Download {state.download.filename}
            </a>
          )}
        </div>
      )}
    </section>
  );
}
