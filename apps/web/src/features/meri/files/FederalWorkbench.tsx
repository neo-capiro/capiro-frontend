"use client";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { Button } from "@capiro/ui/button";
import { Textarea } from "@capiro/ui/textarea";
import type {
  AdmittedFederalReview,
  FederalPublication,
} from "@capiro/meri-contracts/federal-workbench";
import {
  FederalSourceStaleError,
  type FederalSourceView,
  type FederalWorkbenchPort,
} from "../../../shared/meri-documents/federal-workbench";
import {
  authoredFrom,
  authoredOperations,
  type AuthoredInput,
  type AuthoredOperation,
  type Authoring,
} from "../../../shared/meri-documents/federal-authoring";
import type { LibraryVersion } from "../../../shared/meri-documents/library-access";
import { DocumentDownloadUrl } from "./download-url";
import styles from "./files.module.css";
import { FederalAmendmentList } from "./FederalAmendmentList";
import { FederalSourceImporter } from "./FederalSourceImporter";

/** Exact text amendment review. Source claims, coverage and unresolved legal
 * checks remain visible; confirming export never labels a draft legally approved. */
export function FederalWorkbench({ port }: { port: FederalWorkbenchPort }) {
  const id = useId(),
    lifetime = useRef(new AbortController()),
    [urls] = useState(() => new DocumentDownloadUrl());
  const active = useRef(false),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState("");
  const [rows, setRows] = useState<readonly LibraryVersion[]>([]),
    [source, setSource] = useState<FederalSourceView | null>(null);
  const [base, setBase] = useState<AdmittedFederalReview>(),
    [review, setReview] = useState<AdmittedFederalReview | null>(null);
  const [scopeId, setScopeId] = useState(""),
    [kind, setKind] = useState<"replace" | "insert" | "delete">("replace");
  const [drafts, setDrafts] = useState<readonly AuthoredInput[]>([]),
    [authoring, setAuthoring] = useState<Authoring | null>(null);
  const [expected, setExpected] = useState(""),
    [text, setText] = useState(""),
    [position, setPosition] = useState<"before" | "after">("after");
  const [confirmed, setConfirmed] = useState(false),
    [publication, setPublication] = useState<FederalPublication | null>(null);
  const [download, setDownload] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const [pendingOutput, setPendingOutput] = useState<
    FederalPublication["output"] | null
  >(null);
  const [pendingImport, setPendingImport] = useState(false);
  const [page, setPage] = useState<{
    cursor: string | null;
    historyVersionId: string | null;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    active.current = false;
    return () => {
      controller.abort();
      urls.clear();
    };
  }, [urls]);
  const locked =
    busy || (port.unresolved() && (pendingOutput !== null || pendingImport));
  function changed() {
    setReview(null);
    setConfirmed(false);
    setPublication(null);
    urls.clear();
    setDownload(null);
  }
  async function run(action: () => Promise<void>) {
    const controller = lifetime.current;
    if (active.current || controller.signal.aborted) return;
    active.current = true;
    setBusy(true);
    setProblem("");
    try {
      await action();
    } catch (error) {
      if (
        error instanceof FederalSourceStaleError &&
        !controller.signal.aborted
      )
        setConfirmed(false);
      if (!controller.signal.aborted)
        setProblem(
          error instanceof Error
            ? error.message
            : "The document request failed.",
        );
    } finally {
      if (lifetime.current === controller) {
        active.current = false;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }
  async function browse(cursor: string | null = null, append = false) {
    const result = await port.library.list(
      { scope: "conversation", limit: 25, cursor },
      lifetime.current.signal,
    );
    if (!result.ok) throw new Error("The source library is unavailable.");
    const selected = result.value.versions.filter((row) =>
      row.mimeType.startsWith("text/plain"),
    );
    setRows((previous) => (append ? [...previous, ...selected] : selected));
    setPage({ cursor: result.value.nextCursor, historyVersionId: null });
  }
  async function openSource(versionId: string) {
    const selected = await port.source(versionId, lifetime.current.signal);
    applySource(selected);
  }
  function applySource(selected: FederalSourceView) {
    changed();
    setBase(undefined);
    setSource(selected);
    setScopeId(selected.source.scopes[0]?.id ?? "");
    setDrafts([]);
    setAuthoring(null);
    setExpected("");
    setText("");
  }
  async function applyReview(value: AdmittedFederalReview) {
    setBase(value);
    setReview(value);
    setConfirmed(false);
    setPublication(null);
    urls.clear();
    setDownload(null);
    setSource({
      versionId: value.selection.versionId,
      sha256: value.selection.expectedArtifactSha256,
      source: value.prepared.draft.source,
    });
    const operations = value.selection.operations;
    const loaded = authoredFrom(operations);
    setDrafts(loaded);
    // A saved review's own operations are already compiler-confirmed: show them
    // verbatim when this editor cannot re-derive nested intermediate text locally.
    const derived = await authoredOperations(
      value.prepared.draft.source,
      loaded,
    );
    setAuthoring(
      derived.refusal ? { ...derived, operations: [...operations] } : derived,
    );
    const operation = operations[0];
    setScopeId(operation.scopeId);
    setKind(operation.kind);
    setExpected(operation.expectedText);
    setText(operation.text ?? "");
    setPosition(operation.position ?? "after");
  }
  /** Each added amendment is derived against the exact current section text, so
   * the user sees the intermediate hash and dependencies before the compiler. */
  async function rebuild(next: readonly AuthoredInput[]) {
    if (!source) return false;
    const value = await authoredOperations(source.source, next);
    if (value.refusal) {
      setProblem(value.refusal);
      return false;
    }
    setDrafts(next);
    setAuthoring(value);
    return true;
  }
  async function addAmendment() {
    if (!source) return;
    const added: AuthoredInput = {
      id: `amendment-${drafts.length + 1}`,
      kind,
      scopeId,
      expectedText: expected,
      ...(kind === "delete" ? {} : { text }),
      ...(kind === "insert" ? { position } : {}),
    };
    if (await rebuild([...drafts, added])) {
      setExpected("");
      setText("");
    }
  }
  async function removeAmendment(operation: AuthoredOperation) {
    const next = drafts.filter((draft) => draft.id !== operation.id);
    setDrafts(next);
    // Removing an amendment always takes effect, even when the remaining set can
    // only be hashed by the compiler; the local refusal then explains why.
    setAuthoring((previous) =>
      previous
        ? {
            ...previous,
            operations: previous.operations.filter(
              (entry) => entry.id !== operation.id,
            ),
            refusal: null,
          }
        : previous,
    );
    if (!source) return;
    const value = await authoredOperations(source.source, next);
    if (value.refusal) {
      setProblem(value.refusal);
      return;
    }
    setAuthoring(value);
    changed();
    setProblem("");
  }
  function editAmendment(operation: AuthoredOperation) {
    changed();
    setScopeId(operation.scopeId);
    setKind(operation.kind);
    setExpected(operation.expectedText);
    setText(operation.text ?? "");
    setPosition(operation.position ?? "after");
    void run(async () => {
      await removeAmendment(operation);
    });
  }
  async function prepare() {
    if (!source) return;
    const value = await authoredOperations(source.source, drafts);
    if (value.refusal) throw new Error(value.refusal);
    setAuthoring(value);
    const prepared = await port.prepare(
      {
        versionId: source.versionId,
        expectedArtifactSha256: source.sha256,
        operations: [...value.operations] as [
          AuthoredOperation,
          ...AuthoredOperation[],
        ],
      },
      lifetime.current.signal,
      base,
    );
    setReview(prepared);
    setConfirmed(false);
  }
  async function publish(output: FederalPublication["output"]) {
    if (
      !review ||
      (output !== "draft" &&
        !confirmed &&
        !(port.unresolved() && pendingOutput === output))
    )
      return;
    const choosingRecovery = port.unresolved() && pendingOutput === null;
    setPendingOutput(output);
    let value: FederalPublication;
    try {
      value = await port.publish(review, output, lifetime.current.signal);
    } catch (error) {
      if (choosingRecovery || !port.unresolved()) setPendingOutput(null);
      throw error;
    }
    setPendingOutput(null);
    setPublication(value);
    if (output === "draft") {
      const saved = await port.load(
        value.publication.version.versionId,
        value.publication.version.object.sha256,
        lifetime.current.signal,
      );
      await applyReview(saved);
      setPublication(value);
    }
  }
  async function history(
    versionId = base?.savedDraft?.versionId,
    cursor: string | null = null,
    append = false,
  ) {
    if (!versionId) return;
    const result = await port.library.history(
      { versionId, limit: 25, cursor },
      lifetime.current.signal,
    );
    if (!result.ok) throw new Error("Revision history is unavailable.");
    setRows((previous) =>
      append ? [...previous, ...result.value.versions] : result.value.versions,
    );
    setPage({ cursor: result.value.nextCursor, historyVersionId: versionId });
  }
  function handlePublish(event: MouseEvent<HTMLButtonElement>) {
    const output = event.currentTarget.value;
    if (
      output === "draft" ||
      output === "operative" ||
      output === "consolidated" ||
      output === "redline"
    ) {
      void run(() => publish(output));
    }
  }
  async function downloadPublication() {
    if (!publication) return;
    const result = await port.library.download(
      publication.publication.version.versionId,
      lifetime.current.signal,
    );
    if (!result.ok) throw new Error("The exported file is unavailable.");
    setDownload({
      url: urls.replace(
        new Blob([result.value.bytes], { type: result.value.mimeType }),
      ),
      filename: result.value.filename,
    });
  }
  const scope = source?.source.scopes.find((item) => item.id === scopeId);
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <h2 id={id}>Federal amendment review</h2>
      <p>
        Import an official bill version or open a retained source or saved
        review, add ordered exact text amendments, then review the three outputs
        before exporting.
      </p>
      <p className={styles.muted}>
        Official imports are checked against the current source before
        preparation and export. Other source publisher details are retained
        claims. Legal currency, enactment, numbering and substantive law still
        require review. Exports are plain text.
      </p>
      {problem && <p role="alert">{problem}</p>}
      {port.unresolved() && (
        <p role="status">
          A previous file operation needs recovery. Keep its exact source,
          revision and output selected.
        </p>
      )}
      <FederalSourceImporter
        port={port}
        disabled={busy || (port.unresolved() && pendingOutput !== null)}
        signal={() => lifetime.current.signal}
        run={run}
        onPending={setPendingImport}
        onImported={applySource}
      />
      <Button disabled={locked} onClick={() => void run(browse)}>
        Browse source files and saved reviews
      </Button>
      {base?.savedDraft && (
        <Button disabled={locked} onClick={() => void run(history)}>
          Show revision history
        </Button>
      )}
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => (
            <li key={row.versionId}>
              <span>
                {row.filename} · {row.createdAt}
              </span>{" "}
              <Button
                disabled={locked}
                onClick={() => void run(() => openSource(row.versionId))}
              >
                Open source
              </Button>{" "}
              <Button
                disabled={locked}
                onClick={() =>
                  void run(async () =>
                    applyReview(
                      await port.load(
                        row.versionId,
                        row.object.sha256,
                        lifetime.current.signal,
                      ),
                    ),
                  )
                }
              >
                Open saved review
              </Button>
            </li>
          ))}
        </ul>
      )}
      {page && rows.length === 0 && (
        <p>No retained TXT sources or reviews on this page.</p>
      )}
      {page?.cursor && (
        <Button
          disabled={locked}
          onClick={() =>
            void run(() =>
              page.historyVersionId
                ? history(page.historyVersionId, page.cursor, true)
                : browse(page.cursor, true),
            )
          }
        >
          Load more files
        </Button>
      )}
      {source && (
        <>
          <h3>{source.source.documentId}</h3>
          <p>
            Publisher: {source.source.publisher}. Version:{" "}
            {source.source.sourceVersion}. Published:{" "}
            {source.source.publishedAt ?? "Not supplied"}.
          </p>
          <p>
            {source.source.coverage.complete
              ? "Source claims complete coverage."
              : "Partial source coverage."}
          </p>
          <ul>
            {source.source.coverage.limitations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <details>
            <summary>Retained source details</summary>
            <p>{source.source.sourceUrl}</p>
            <p className={styles.identifier}>
              Source hash: {source.source.sha256}
            </p>
          </details>
          <p>
            {authoring?.operations.length
              ? "These ordered amendments are checked against the exact current section text before the compiler answers."
              : "Add one or more ordered exact amendments, then prepare them together for review."}
          </p>
          <FederalAmendmentList
            operations={authoring?.operations ?? []}
            disabled={locked}
            onEdit={(operation) => editAmendment(operation)}
            onRemove={(operation) =>
              void run(async () => {
                await removeAmendment(operation);
              })
            }
          />
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (!locked) void run(prepare);
            }}
          >
            <fieldset disabled={locked}>
              <label className={styles.field}>
                Source section
                <select
                  value={scopeId}
                  onChange={(event) => {
                    changed();
                    setScopeId(event.target.value);
                  }}
                >
                  {source.source.scopes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              {scope && (
                <pre>{source.source.text.slice(scope.start, scope.end)}</pre>
              )}
              <label className={styles.field}>
                Amendment
                <select
                  value={kind}
                  onChange={(event) => {
                    changed();
                    setKind(event.target.value as typeof kind);
                  }}
                >
                  <option value="replace">Replace text</option>
                  <option value="insert">Insert text</option>
                  <option value="delete">Delete text</option>
                </select>
              </label>
              <label className={styles.field}>
                Exact text to find
                <Textarea
                  aria-label="Exact text to find"
                  value={expected}
                  onChange={(event) => {
                    changed();
                    setExpected(event.target.value);
                  }}
                />
              </label>
              {kind === "insert" && (
                <label className={styles.field}>
                  Insert position
                  <select
                    value={position}
                    onChange={(event) => {
                      changed();
                      setPosition(event.target.value as typeof position);
                    }}
                  >
                    <option value="before">Before the exact text</option>
                    <option value="after">After the exact text</option>
                  </select>
                </label>
              )}
              {kind !== "delete" && (
                <label className={styles.field}>
                  New text
                  <Textarea
                    aria-label="New text"
                    value={text}
                    onChange={(event) => {
                      changed();
                      setText(event.target.value);
                    }}
                  />
                </label>
              )}
              <Button
                type="button"
                disabled={!expected || (kind !== "delete" && !text)}
                onClick={() => void run(addAmendment)}
              >
                Add amendment to review
              </Button>
              <Button type="submit" disabled={!authoring?.operations.length}>
                Prepare these amendments for review
              </Button>
            </fieldset>
          </form>
        </>
      )}
      {review && (
        <>
          <h3>Review this revision</h3>
          {(["operative", "consolidated", "redline"] as const).map((output) => (
            <details key={output} open={output === "operative"}>
              <summary>
                {output === "operative"
                  ? "Operative amendment"
                  : output === "consolidated"
                    ? "Consolidated text"
                    : "Legal redline"}
              </summary>
              <pre>{review.prepared.draft.outputs[output]}</pre>
            </details>
          ))}
          <ul>
            {review.prepared.draft.findings
              .filter((item) => item.status === "unresolved")
              .map((item) => (
                <li key={item.category}>{item.category}: review required</li>
              ))}
          </ul>
          <p className={styles.identifier}>
            Reviewed revision: {review.prepared.revisionSha256}
          </p>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={locked}
              onChange={(event) => setConfirmed(event.target.checked)}
            />{" "}
            I have reviewed this exact revision and want to export the selected
            text.
          </label>
          <div>
            <Button disabled={locked} value="draft" onClick={handlePublish}>
              Save review revision
            </Button>
            {(["operative", "consolidated", "redline"] as const).map(
              (output) => (
                <Button
                  key={output}
                  disabled={locked || !confirmed}
                  value={output}
                  onClick={handlePublish}
                >
                  Export {output}
                </Button>
              ),
            )}
            {port.unresolved() && pendingOutput && (
              <Button
                disabled={busy}
                value={pendingOutput}
                onClick={handlePublish}
              >
                Recover original operation
              </Button>
            )}
            {port.unresolved() &&
              !pendingOutput &&
              (["draft", "operative", "consolidated", "redline"] as const).map(
                (output) => (
                  <Button
                    key={"recover-" + output}
                    disabled={busy || (output !== "draft" && !confirmed)}
                    value={output}
                    onClick={handlePublish}
                  >
                    Recover original {output}
                  </Button>
                ),
              )}
          </div>
        </>
      )}
      {publication && (
        <p role="status">
          Saved {publication.publication.version.filename}.{" "}
          <Button disabled={busy} onClick={() => void run(downloadPublication)}>
            Get verified file
          </Button>
        </p>
      )}
      {download && (
        <a href={download.url} download={download.filename}>
          Save {download.filename}
        </a>
      )}
    </section>
  );
}
