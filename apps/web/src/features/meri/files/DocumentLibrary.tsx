"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { NativeResultFiles } from "./NativeResultFiles";
import { LibrarySelectedVersion } from "./LibrarySelectedVersion";
import { LibraryVersions } from "./LibraryVersions";
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
import {
  immediateRenewal,
  libraryConnectionPhase,
  libraryReconnectState,
} from "./library-connection";
import { useReconnectSchedule } from "../../../shared/meri-conversations/reconnect-schedule";
import { isOfficeTarget } from "../office/OfficeWorkspaceLink";
import styles from "./files.module.css";

type Account = { tenantId: string; actorId: string };
type Origin = { conversationId: string; clientId: string | null };

/** The Workspace's Office list shows only Word, Excel and PowerPoint versions; the Files library shows none of them. */
export const libraryRows = (
  versions: readonly LibraryVersion[],
  office: boolean,
) => versions.filter((version) => isOfficeTarget(version) === office);

/** Opens saved contexts only; no conversation or run is created to browse retained files. */
export function DocumentLibrary({
  account,
  clientId,
  officeOpen,
  autoOpen = false,
}: {
  account: Account;
  clientId?: string;
  /** The Workspace's Office documents: only Word, Excel and PowerPoint versions, each opened by this action.
   * Absent (the Files library), those versions are not listed here at all. */
  officeOpen?: ((version: LibraryVersion) => void) | undefined;
  /** Load the saved conversations at once and open the newest one, so the files list without a click. */
  autoOpen?: boolean;
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
  // The Workspace lists the person's Office documents without a conversation choice first: the newest saved
  // conversation (in this client, or any) opens the library in its owner or client scope.
  const opened = useRef(false);
  useEffect(() => {
    if (!autoOpen || opened.current) return;
    opened.current = true;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one discovery read when the library mounts
  }, [autoOpen]);
  const first = rows[0];
  const shownOrigin: Origin | null =
    origin ??
    (autoOpen && first
      ? {
          conversationId: first.conversationId,
          clientId: libraryOriginClient(first, account),
        }
      : null);
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
              value={shownOrigin?.conversationId ?? ""}
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
      {shownOrigin && (
        <LibraryConnection
          key={JSON.stringify(shownOrigin)}
          account={account}
          origin={shownOrigin}
          officeOpen={officeOpen}
        />
      )}
    </section>
  );
}

function LibraryConnection({
  account,
  origin,
  anchor,
  officeOpen,
}: {
  account: Account;
  origin: Origin;
  anchor?: LibraryVersion;
  officeOpen?: ((version: LibraryVersion) => void) | undefined;
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
  // The last ready port stays mounted through the session's own renewal (Meri ends each file-access session
  // before its cap and issues the next) and through an issuance the control did not answer; see
  // `libraryConnectionPhase`. Only a refusal clears it.
  const [shown, setShown] = useState<{
    port: DocumentLibraryAccess;
    lifetimeKey: string;
  } | null>(null);
  if (state.status === "ready" && shown?.port !== state.port)
    setShown({ port: state.port, lifetimeKey: state.lifetimeKey });
  const phase = libraryConnectionPhase(
    state.status,
    host.getExpirationReason(),
    host.getIssuanceStatus(),
    shown !== null,
  );
  if (phase === "lost" && shown !== null) setShown(null);
  const reason = host.getExpirationReason();
  // The planned early end reconnects at once. A hard-cap expiry (a session that could not renew in time) and an
  // unanswered issuance go through the shared reconnect schedule, whose ladder (2 s doubling to 30 s) bounds the
  // attempts, so a short-lived receipt can never drive a request storm.
  useEffect(() => {
    if (immediateRenewal(phase, state.status, reason)) void host.connect();
  }, [phase, state.status, reason, host]);
  const connect = useCallback(() => void host.connect(), [host]);
  const schedule = useReconnectSchedule(
    libraryReconnectState(phase, state.status, reason),
    connect,
  );
  const label = anchor
    ? "Version history connection"
    : "File library connection";
  const askAgain = phase === "lost" || state.status === "unavailable";
  const notice =
    phase === "renewing"
      ? "Renewing file access…"
      : phase === "retrying"
        ? "File access could not be checked just now; checking again."
        : phase === "connecting"
          ? state.status === "unavailable"
            ? "File access could not be checked just now; checking again."
            : "Checking current file access…"
          : phase === "lost"
            ? "Current file access is unavailable. Previously loaded details have been cleared."
            : null;
  return (
    <>
      {notice && (
        <section className={styles.panel} aria-label={label}>
          <p role="status">{notice}</p>
          {askAgain && (
            <Button
              variant="outline"
              onClick={() => {
                schedule.reset();
                void host.connect();
              }}
            >
              Check access again
            </Button>
          )}
        </section>
      )}
      {shown && (
        <>
          <NativeResultFiles
            key={`results:${shown.lifetimeKey}`}
            port={shown.port}
          />
          <LibraryPages
            key={shown.lifetimeKey}
            port={shown.port}
            account={account}
            officeOpen={officeOpen}
            {...(anchor ? { anchor } : {})}
          />
        </>
      )}
    </>
  );
}

function LibraryPages({
  port,
  account,
  anchor,
  officeOpen,
}: {
  port: DocumentLibraryAccess;
  account: Account;
  anchor?: LibraryVersion;
  officeOpen?: ((version: LibraryVersion) => void) | undefined;
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
        officeOpen={officeOpen}
        onHistory={setSelected}
      />
      {!anchor && selected && (
        <LibraryConnection
          key={selected.versionId}
          account={account}
          anchor={selected}
          officeOpen={officeOpen}
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
  officeOpen,
  onHistory,
}: {
  port: DocumentLibraryAccess;
  query: { scope: LibraryScope } | { anchor: LibraryVersion };
  officeOpen?: ((version: LibraryVersion) => void) | undefined;
  onHistory: (version: LibraryVersion) => void;
}) {
  const [controller] = useState(
    () => new DocumentLibraryController(port, query),
  );
  useLayoutEffect(() => controller.attach(), [controller]);
  // A renewed session's port replaces the disposed one for the same context; the loaded page stays.
  useEffect(() => controller.bind(port), [controller, port]);
  useEffect(() => {
    void controller.loadMore();
  }, [controller]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const history = "anchor" in query;
  const office = officeOpen !== undefined;
  const versions = libraryRows(state.versions, office);
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
      <LibraryVersions
        versions={versions}
        busy={state.busy}
        history={history}
        onSelect={(version) =>
          history ? controller.select(version) : onHistory(version)
        }
      />
      {state.loaded && versions.length === 0 && (
        <p role="status">
          {state.nextCursor === null
            ? office
              ? "No Office document is currently available in this scope."
              : "No files are currently available in this scope."
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
        <LibrarySelectedVersion
          port={port}
          controller={controller}
          state={state}
          selected={state.selected}
          officeOpen={officeOpen}
        />
      )}
    </section>
  );
}
