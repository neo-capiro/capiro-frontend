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
  const [textMode, setTextMode] = useState<"decoded-xml" | undefined>();
  const [drafts, setDrafts] = useState<readonly AuthoredInput[]>([]),
    [authoring, setAuthoring] = useState<Authoring | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  const removalPlanned = drafts.some(
    (draft) => draft.kind === "remove_source_text",
  );
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
    setTextMode(undefined);
    setDrafts([]);
    setAuthoring(null);
    setEditingId(null);
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
    setEditingId(null);
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
    setTextMode(
      operation.kind === "remove_source_text" ? undefined : operation.textMode,
    );
    setScopeId(
      operation.kind === "remove_source_text"
        ? (value.prepared.draft.source.scopes[0]?.id ?? "")
        : operation.scopeId,
    );
    setKind(
      operation.kind === "remove_source_text" ? "replace" : operation.kind,
    );
    setExpected(
      operation.kind === "remove_source_text" ? "" : operation.expectedText,
    );
    setText(
      operation.kind === "remove_source_text" ? "" : (operation.text ?? ""),
    );
    setPosition(
      operation.kind === "remove_source_text"
        ? "after"
        : (operation.position ?? "after"),
    );
  }
  /** Each added amendment is derived against the exact current section text, so
   * the user sees the intermediate hash and dependencies before the compiler. */
  async function addAmendment() {
    if (!source || (removalPlanned && !editingId)) return;
    let amendmentId = editingId ?? `amendment-${crypto.randomUUID()}`;
    while (!editingId && drafts.some((draft) => draft.id === amendmentId))
      amendmentId = `amendment-${crypto.randomUUID()}`;
    const added: AuthoredInput = {
      id: amendmentId,
      kind,
      scopeId,
      expectedText: expected,
      ...(textMode ? { textMode } : {}),
      ...(kind === "delete" ? {} : { text }),
      ...(kind === "insert" ? { position } : {}),
    };
    const next = editingId
      ? drafts.map((draft) => (draft.id === editingId ? added : draft))
      : [...drafts, added];
    if (JSON.stringify(next) !== JSON.stringify(drafts)) {
      const value = await authoredOperations(source.source, next);
      if (value.refusal) {
        setProblem(value.refusal);
        return;
      }
      changed();
      setDrafts(next);
      setAuthoring(value);
    }
    cancelEdit();
  }
  async function removeSourceText() {
    if (!source || editingId || removalPlanned || drafts.length >= 64) return;
    let amendmentId = `amendment-${crypto.randomUUID()}`;
    while (drafts.some((draft) => draft.id === amendmentId))
      amendmentId = `amendment-${crypto.randomUUID()}`;
    const next: readonly AuthoredInput[] = [
      ...drafts,
      { id: amendmentId, kind: "remove_source_text" },
    ];
    const value = await authoredOperations(source.source, next);
    if (value.refusal) {
      setProblem(value.refusal);
      return;
    }
    changed();
    setDrafts(next);
    setAuthoring(value);
    cancelEdit();
  }
  async function removeAmendment(operation: AuthoredInput) {
    const next = drafts.filter((draft) => draft.id !== operation.id);
    changed();
    setDrafts(next);
    setAuthoring(null);
    if (editingId === operation.id) cancelEdit();
    // Removing an amendment always takes effect, even when the remaining set can
    // only be hashed by the compiler. Never retain the removed set's review or hashes.
    if (!source) return;
    const value = await authoredOperations(source.source, next);
    setAuthoring(value);
    setProblem(value.refusal ?? "");
  }
  function cancelEdit() {
    setEditingId(null);
    setExpected("");
    setText("");
    setProblem("");
    setTextMode(
      scope && "textRun" in scope && scope.textRun ? "decoded-xml" : undefined,
    );
  }
  function editAmendment(operation: AuthoredInput) {
    if (operation.kind === "remove_source_text") return;
    setEditingId(operation.id);
    setScopeId(operation.scopeId);
    setKind(operation.kind);
    setExpected(operation.expectedText);
    setText(operation.text ?? "");
    setPosition(operation.position ?? "after");
    setTextMode(operation.textMode);
  }
  async function prepare() {
    if (!source || editingId || !drafts.length) return;
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
      editingId ||
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
      output === "redline" ||
      output === "docx" ||
      output === "xml" ||
      output === "pdf"
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
  const textRun =
    source?.source.parserVersion === "federal-uslm-xml/3"
      ? source.source.scopes.find((item) => item.id === scopeId)?.textRun
      : undefined;
  const currentScope = authoring?.scopes.find((item) => item.id === scopeId);
  const reviewedDraft = review?.prepared.draft;
  const removed =
    reviewedDraft &&
    "resultKind" in reviewedDraft &&
    reviewedDraft.resultKind === "source-text-removed";
  const schemaQualified =
    reviewedDraft?.parserVersion === "federal-uslm-xml/2" ||
    reviewedDraft?.parserVersion === "federal-uslm-xml/3";
  const structured = reviewedDraft?.parserVersion === "federal-uslm-xml/3";
  const projection = reviewedDraft?.structuralProjection;
  const exportOutputs: FederalPublication["output"][] = [
    "operative",
    "consolidated",
    "redline",
    ...(schemaQualified && !removed ? ["xml" as const] : []),
    ...(!structured || projection?.status === "supported"
      ? ["docx" as const]
      : []),
    ...(structured && projection?.status === "supported"
      ? ["pdf" as const]
      : []),
  ];
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
        require review. Available export formats are shown after review.
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
            drafts={drafts}
            operations={authoring?.operations ?? []}
            disabled={locked}
            onEdit={(operation) => editAmendment(operation)}
            onRemove={(operation) =>
              void run(async () => {
                await removeAmendment(operation);
              })
            }
          />
          {removalPlanned && (
            <p>
              Proposed whole-source removal is the final amendment. The
              consolidated TXT will contain zero bytes. Remove that amendment to
              add more text amendments. This does not establish enactment.
            </p>
          )}
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
                  aria-label="Source section"
                  disabled={removalPlanned && !editingId}
                  value={scopeId}
                  onChange={(event) => {
                    if (!editingId) changed();
                    setScopeId(event.target.value);
                    const selected = source.source.scopes.find(
                      (item) => item.id === event.target.value,
                    );
                    setTextMode(
                      selected && "textRun" in selected && selected.textRun
                        ? "decoded-xml"
                        : undefined,
                    );
                  }}
                >
                  {source.source.scopes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {"textRun" in item && item.textRun ? " · text run" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {textRun && (
                <label className={styles.field}>
                  Text run editing
                  <select
                    aria-label="Text run editing"
                    value={textMode ?? "raw"}
                    disabled={removalPlanned && !editingId}
                    onChange={(event) => {
                      if (!editingId) changed();
                      setTextMode(
                        event.target.value === "decoded-xml"
                          ? "decoded-xml"
                          : undefined,
                      );
                    }}
                  >
                    <option value="decoded-xml">Decoded text</option>
                    <option value="raw">Exact XML</option>
                  </select>
                </label>
              )}
              {scope && (
                <>
                  <p>
                    {textMode === "decoded-xml"
                      ? "Current decoded text run"
                      : "Current exact source section"}{" "}
                    after authored amendments:
                  </p>
                  {textMode === "decoded-xml" &&
                  currentScope?.decoded === null ? (
                    <p>
                      This run cannot be displayed as decoded text after its raw
                      XML amendment.
                    </p>
                  ) : (
                    <pre>
                      {textMode === "decoded-xml"
                        ? (currentScope?.decoded ?? textRun?.decoded)
                        : (currentScope?.current ??
                          source.source.text.slice(scope.start, scope.end))}
                    </pre>
                  )}
                </>
              )}
              <label className={styles.field}>
                Amendment
                <select
                  disabled={removalPlanned && !editingId}
                  value={kind}
                  onChange={(event) => {
                    if (!editingId) changed();
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
                  disabled={removalPlanned && !editingId}
                  aria-label="Exact text to find"
                  value={expected}
                  onChange={(event) => {
                    if (!editingId) changed();
                    setExpected(event.target.value);
                  }}
                />
              </label>
              {kind === "insert" && (
                <label className={styles.field}>
                  Insert position
                  <select
                    disabled={removalPlanned && !editingId}
                    value={position}
                    onChange={(event) => {
                      if (!editingId) changed();
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
                    disabled={removalPlanned && !editingId}
                    aria-label="New text"
                    value={text}
                    onChange={(event) => {
                      if (!editingId) changed();
                      setText(event.target.value);
                    }}
                  />
                </label>
              )}
              <Button
                type="button"
                disabled={
                  (removalPlanned && !editingId) ||
                  !expected ||
                  (kind !== "delete" && !text)
                }
                onClick={() => void run(addAmendment)}
              >
                {editingId ? "Update amendment" : "Add amendment to review"}
              </Button>
              {editingId && (
                <Button type="button" onClick={cancelEdit}>
                  Cancel edit
                </Button>
              )}
              <Button
                type="button"
                disabled={
                  locked ||
                  Boolean(editingId) ||
                  removalPlanned ||
                  drafts.length >= 64 ||
                  !source.source.coverage.complete
                }
                onClick={() => void run(removeSourceText)}
              >
                Propose whole-source removal
              </Button>
              <Button
                type="submit"
                disabled={
                  Boolean(editingId) ||
                  !drafts.length ||
                  Boolean(authoring?.refusal)
                }
              >
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
              {output === "consolidated" &&
              "resultKind" in review.prepared.draft &&
              review.prepared.draft.resultKind === "source-text-removed" ? (
                <p>
                  The proposed consolidated source is empty. Its TXT export
                  contains exactly zero bytes; the original source remains in
                  retained history. This does not establish enactment.
                </p>
              ) : (
                <pre>{review.prepared.draft.outputs[output]}</pre>
              )}
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
          {schemaQualified && (
            <p>
              {removed
                ? "Consolidated XML is unavailable for proposed whole-source removal; consolidated TXT remains exactly zero bytes."
                : "Consolidated XML preserves the exact consolidated UTF-8 XML text."}
            </p>
          )}
          {structured && projection?.status !== "supported" && (
            <p>
              Word and PDF dossiers are unavailable for this revision:{" "}
              {projection?.status === "unsupported" &&
              projection.code === "DRAFT_OUTPUT_LIMIT"
                ? "the document exceeds the supported export limits."
                : "its XML includes structures outside the supported document subset."}{" "}
              Text review and TXT{!removed ? "/XML" : ""} export remain
              available.
            </p>
          )}
          {structured && projection?.status === "supported" && (
            <p>
              Word and PDF dossiers show separate original and revised views,
              with deletions struck through and insertions underlined. These are
              not Word tracked changes. PDF export also requires a qualified
              server renderer and may be refused when that renderer is
              unavailable.
            </p>
          )}
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={locked || Boolean(editingId)}
              onChange={(event) => setConfirmed(event.target.checked)}
            />{" "}
            I have reviewed this exact revision and want to export the selected
            text.
          </label>
          <div>
            <Button
              disabled={locked || Boolean(editingId)}
              value="draft"
              onClick={handlePublish}
            >
              Save review revision
            </Button>
            {exportOutputs.map((output) => (
              <Button
                key={output}
                disabled={locked || Boolean(editingId) || !confirmed}
                value={output}
                onClick={handlePublish}
              >
                {output === "xml"
                  ? "Export consolidated XML"
                  : output === "docx"
                    ? "Export Word dossier"
                    : output === "pdf"
                      ? "Export PDF dossier"
                      : `Export ${output}`}
              </Button>
            ))}
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
              (["draft", ...exportOutputs] as const).map((output) => (
                <Button
                  key={"recover-" + output}
                  disabled={busy || (output !== "draft" && !confirmed)}
                  value={output}
                  onClick={handlePublish}
                >
                  Recover original {output}
                </Button>
              ))}
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
