"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
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
  const [pending, setPending] = useState<FederalSourceChoice | null>(null);
  async function browse(after = 0) {
    const value = await port.sources(after, signal());
    setPage(value);
  }
  async function importSource(choice: FederalSourceChoice) {
    const choosingRecovery = port.unresolved() && pending === null;
    setPending(choice);
    onPending(true);
    try {
      const source = await port.importSource(choice.selection, signal());
      onImported(source);
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
                    onClick={() => void run(() => importSource(choice))}
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
          onClick={() => void run(() => importSource(pending))}
        >
          Recover selected source import
        </Button>
      )}
    </section>
  );
}
