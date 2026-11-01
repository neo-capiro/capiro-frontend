"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type { FederalImportRequest } from "@capiro/meri-contracts/federal-workbench";
import type { FederalSourceChoice } from "../../../shared/meri-documents/federal-sources";
import type {
  FederalSourceView,
  FederalWorkbenchPort,
} from "../../../shared/meri-documents/federal-workbench";

/** Holds only the selected saved citation while its original import is unresolved.
 * The document journal owns delivery identity across remounts. */
export function FederalSourceImporter({
  port,
  disabled,
  signal,
  run,
  onPending,
  onImported,
}: {
  port: FederalWorkbenchPort;
  disabled: boolean;
  signal: () => AbortSignal;
  run: (action: () => Promise<void>) => Promise<void>;
  onPending: (pending: boolean) => void;
  onImported: (source: FederalSourceView) => void;
}) {
  const [page, setPage] = useState<{
    sources: readonly FederalSourceChoice[];
    nextAfter: number | null;
  } | null>(null);
  const [mode, setMode] = useState("legacy");
  const [captured, setCaptured] = useState<{
    choice: FederalSourceChoice;
    capture: NonNullable<FederalSourceView["capture"]>;
    source: FederalSourceView["source"];
  } | null>(null);
  const [pending, setPending] = useState<{
    choice: FederalSourceChoice;
    representation: FederalImportRequest["representation"];
    validationProfile: FederalImportRequest["validationProfile"];
    sourceProfile: FederalImportRequest["sourceProfile"];
  } | null>(null);
  async function browse(after = 0) {
    const value = await port.sources(after, signal());
    setPage(value);
  }
  async function importSource(
    choice: FederalSourceChoice,
    representation: FederalImportRequest["representation"],
    validationProfile: FederalImportRequest["validationProfile"],
    sourceProfile: FederalImportRequest["sourceProfile"],
  ) {
    const choosingRecovery = port.unresolved() && pending === null;
    setCaptured(null);
    setPending({ choice, representation, validationProfile, sourceProfile });
    onPending(true);
    try {
      const source = await port.importSource(
        choice.selection,
        signal(),
        representation,
        validationProfile,
        sourceProfile,
      );
      onImported(source);
      setCaptured(
        source.capture
          ? { choice, capture: source.capture, source: source.source }
          : null,
      );
      setPending(null);
      onPending(false);
    } catch (error) {
      if (choosingRecovery || !port.unresolved()) {
        setPending(null);
        onPending(false);
      }
      throw error;
    }
  }
  return (
    <section aria-label="Official bill sources">
      <h3>Import an official bill source</h3>
      <p>
        Choose a bill version cited in this conversation. Import checks the
        current official source and saves its exact text for amendment review.
      </p>
      <label>
        Source import checks{" "}
        <select
          value={mode}
          disabled={disabled || pending !== null}
          onChange={(event) => setMode(event.target.value)}
        >
          <option value="legacy">Retained source text</option>
          <option value="raw">Verified captured UTF-8 bytes</option>
          <option value="uslm">Pinned USLM 2.1 schema validation</option>
          <option value="runs">
            Pinned USLM 2.1 with decoded text editing
          </option>
        </select>
      </label>
      <p>
        Verified capture requires recorded evidence and may refuse historical
        sources without it. Pinned USLM 2.1 also requires the captured XML to
        pass that schema. Schema validation checks syntax, not legal
        correctness, currency or enactment. Raw capture alone does not establish
        schema validity. Neither mode silently falls back to weaker checks. When
        recovering an earlier import, select the same mode and bill version.
      </p>
      <p>
        Decoded text editing exposes individual XML text runs as readable text,
        including decoded character references. Exact XML sections remain
        available. It does not combine text across inline elements.
      </p>
      <Button
        disabled={disabled || pending !== null}
        onClick={() => void run(browse)}
      >
        Browse cited bill versions
      </Button>
      {page && (
        <>
          {page.sources.length === 0 ? (
            <p>
              No cited bill versions on this page. Read a bill in this
              conversation to make its version available here.
            </p>
          ) : (
            <ul>
              {page.sources.map((choice) => (
                <li key={choice.eventId}>
                  <span>
                    {choice.selection.billId} · Version{" "}
                    {choice.selection.versionCode}
                  </span>{" "}
                  <details>
                    <summary>Exact source revision</summary>
                    {choice.selection.revisionId}
                  </details>
                  <Button
                    disabled={disabled || pending !== null}
                    onClick={() =>
                      void run(() =>
                        importSource(
                          choice,
                          mode === "legacy" ? undefined : "retained-raw-utf8/1",
                          mode === "uslm" || mode === "runs"
                            ? "uslm-2.1.0"
                            : undefined,
                          mode === "runs" ? "uslm-text-runs/1" : undefined,
                        ),
                      )
                    }
                  >
                    {port.unresolved()
                      ? "Recover original source import"
                      : "Import this bill version"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {page.nextAfter !== null && (
            <Button
              disabled={disabled || pending !== null}
              onClick={() => void run(() => browse(page.nextAfter!))}
            >
              More cited bill versions
            </Button>
          )}
        </>
      )}
      {pending && port.unresolved() && (
        <Button
          disabled={disabled}
          onClick={() =>
            void run(() =>
              importSource(
                pending.choice,
                pending.representation,
                pending.validationProfile,
                pending.sourceProfile,
              ),
            )
          }
        >
          Recover selected source import
        </Button>
      )}
      {captured && (
        <details>
          <summary>Verified source capture</summary>
          <p>
            {captured.choice.selection.billId} · Version{" "}
            {captured.choice.selection.versionCode} · Revision{" "}
            {captured.choice.selection.revisionId}
          </p>
          <p>
            {captured.capture.byteLength} UTF-8 bytes ·{" "}
            {captured.capture.format.toUpperCase()}
          </p>
          <p>Captured body SHA-256: {captured.capture.sha256}</p>
          {"validation" in captured.source && (
            <>
              <p>
                Passed pinned USLM 2.1 syntax validation ·{" "}
                {captured.source.validation.bytes} bytes
              </p>
              <p>Validation profile: {captured.source.validation.profile}</p>
              <p>Schema SHA-256: {captured.source.validation.schemaSha256}</p>
              <p>
                Validated source SHA-256:{" "}
                {captured.source.validation.sourceSha256}
              </p>
            </>
          )}
        </details>
      )}
    </section>
  );
}
