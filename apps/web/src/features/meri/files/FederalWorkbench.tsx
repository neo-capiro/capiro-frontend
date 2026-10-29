"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@capiro/ui/button";
import { Textarea } from "@capiro/ui/textarea";
import type {
  AdmittedFederalReview,
  FederalPublication,
} from "@capiro/meri-contracts/federal-workbench";
import {
  federalTextHash,
  type FederalSourceView,
  type FederalWorkbenchPort,
} from "../../../shared/meri-documents/federal-workbench";
import type { LibraryVersion } from "../../../shared/meri-documents/library-access";
import { DocumentDownloadUrl } from "./download-url";
import styles from "./files.module.css";

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
  const locked = busy || (port.unresolved() && pendingOutput !== null);
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
    changed();
    setBase(undefined);
    setSource(selected);
    setScopeId(selected.source.scopes[0]?.id ?? "");
    setExpected("");
    setText("");
  }
  function useReview(value: AdmittedFederalReview) {
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
    const operation = value.selection.operations[0];
    setScopeId(operation.scopeId);
    setKind(operation.kind);
    setExpected(operation.expectedText);
    setText(operation.text ?? "");
    setPosition(operation.position ?? "after");
  }
  async function prepare() {
    if (!source) return;
    const scope = source.source.scopes.find((scope) => scope.id === scopeId);
    if (!scope) throw new Error("Choose an exact source section.");
    const operation = {
      id: "amendment-1",
      scopeId,
      kind,
      expectedScopeSha256: scope.sha256,
      expectedText: expected,
      expectedTextSha256: await federalTextHash(expected),
      dependsOn: [],
      ...(kind === "delete" ? {} : { text }),
      ...(kind === "insert" ? { position } : {}),
    };
    const value = await port.prepare(
      {
        versionId: source.versionId,
        expectedArtifactSha256: source.sha256,
        operations: [operation],
      },
      lifetime.current.signal,
      base,
    );
    setReview(value);
    setConfirmed(false);
  }
  async function publish(output: FederalPublication["output"]) {
    if (!review || (output !== "draft" && !confirmed)) return;
    const choosingRecovery = port.unresolved() && pendingOutput === null;
    setPendingOutput(output);
    let value: FederalPublication;
    try {
      value = await port.publish(review, output, lifetime.current.signal);
    } catch (error) {
      if (choosingRecovery) setPendingOutput(null);
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
      useReview(saved);
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
  const multiple = Boolean(base && base.selection.operations.length > 1);
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <h2 id={id}>Federal amendment review</h2>
      <p>
        Open a retained source or saved review, prepare an exact text amendment,
        then review the three outputs before exporting.
      </p>
      <p className={styles.muted}>
        Source publisher details are retained claims. Legal currency, enactment,
        numbering and substantive law still require review. Exports are plain
        text.
      </p>
      {problem && <p role="alert">{problem}</p>}
      {port.unresolved() && (
        <p role="status">
          A previous file operation needs recovery. Keep its exact revision and
          output selected.
        </p>
      )}
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
                    useReview(
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
          {multiple && (
            <p>
              This saved review contains several ordered amendments. Its exact
              outputs can be reviewed and exported; this editor prepares one
              amendment at a time.
            </p>
          )}
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (!locked) void run(prepare);
            }}
          >
            <fieldset disabled={locked || multiple}>
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
                type="submit"
                disabled={!expected || (kind !== "delete" && !text)}
              >
                Prepare amendment for review
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
            <Button
              disabled={locked}
              onClick={() => void run(() => publish("draft"))}
            >
              Save review revision
            </Button>
            {(["operative", "consolidated", "redline"] as const).map(
              (output) => (
                <Button
                  key={output}
                  disabled={locked || !confirmed}
                  onClick={() => void run(() => publish(output))}
                >
                  Export {output}
                </Button>
              ),
            )}
            {port.unresolved() && pendingOutput && (
              <Button
                disabled={busy}
                onClick={() => void run(() => publish(pendingOutput))}
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
                    onClick={() => void run(() => publish(output))}
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
