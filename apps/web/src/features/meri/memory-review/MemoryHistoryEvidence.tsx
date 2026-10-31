"use client";
import Link from "next/link";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import {
  ownerHistoryPath,
  receiveOwnerHistory,
  type HistoryPage,
  type OwnerMemoryRef,
  type OwnerReadKind,
} from "./owner-history";
import ui from "../ui/meri-ui.module.css";
import { useSelectedClient } from "../../../shared/session/SelectedClient";

/** Keyed by authenticated scope and item so old results disappear synchronously. */
export function MemoryHistoryEvidence({
  reference,
  clientId,
  revision,
}: {
  reference: OwnerMemoryRef;
  clientId: string | null;
  revision: string;
}) {
  const { userId, orgId } = useAuth();
  const selected = useSelectedClient();
  const key = JSON.stringify([
    userId,
    orgId,
    selected.state,
    "requestedId" in selected ? selected.requestedId : null,
    clientId,
    reference.id,
    revision,
  ]);
  return userId &&
    (selected.state === "no-selection" ||
      selected.state === "authorized-client") ? (
    <OwnerDetails key={key} reference={reference} />
  ) : null;
}
function OwnerDetails({ reference }: { reference: OwnerMemoryRef }) {
  const [page, setPage] = useState<HistoryPage | null>(null);
  const [state, setState] = useState<
    "idle" | "loading" | "ready" | "changed" | "unavailable" | "error"
  >("idle");
  const [kind, setKind] = useState<OwnerReadKind>("versions");
  const abort = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      abort.current?.abort();
    },
    [],
  );
  async function read(nextKind: OwnerReadKind, cursor?: string) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const requestGeneration = ++generation.current;
    setKind(nextKind);
    setState("loading");
    // Previously authorized content is never retained during another read.
    setPage(null);
    try {
      const query = new URLSearchParams({ limit: "25" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(
        `${ownerHistoryPath(reference, nextKind)}?${query}`,
        {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (generation.current !== requestGeneration || controller.signal.aborted)
        return;
      if (!response.ok) {
        setState(
          response.status === 409
            ? "changed"
            : [401, 403, 404, 503].includes(response.status)
              ? "unavailable"
              : "error",
        );
        return;
      }
      const value = receiveOwnerHistory(
        await response.json(),
        reference,
        nextKind,
      );
      if (generation.current !== requestGeneration || controller.signal.aborted)
        return;
      setPage(value);
      setState("ready");
    } catch {
      if (
        generation.current === requestGeneration &&
        !controller.signal.aborted
      )
        setState("unavailable");
    }
  }
  return (
    <section
      id={`memory-details-${reference.id}`}
      aria-label="Memory history and evidence"
    >
      <div className={ui.row}>
        <button
          type="button"
          className={ui.outline}
          disabled={state === "loading"}
          onClick={() => void read("versions")}
        >
          History
        </button>
        <button
          type="button"
          className={ui.outline}
          disabled={state === "loading"}
          onClick={() => void read("evidence")}
        >
          View evidence
        </button>
      </div>
      {state === "loading" ? (
        <p role="status">
          Loading {kind === "versions" ? "history" : "evidence"}…
        </p>
      ) : null}
      {state === "changed" ? (
        <p role="status">
          This memory changed. Reload current memory before opening its history
          again.
        </p>
      ) : null}
      {state === "unavailable" ? (
        <p role="status">
          This memory read is unavailable or access has changed.
        </p>
      ) : null}
      {state === "error" ? (
        <p role="alert">The request failed. Try again.</p>
      ) : null}
      {page?.availability === "unsupported" ? (
        <p role="status">
          An authenticated source reader is not connected for this memory. No
          source links are available.
        </p>
      ) : null}
      {page?.availability === "unavailable" ? (
        <p role="status">The source is unavailable or access has changed.</p>
      ) : null}
      {page?.sources?.map((source) => (
        <p key={source.reference.id}>
          <Link
            href={conversationHref(
              source.reference.clientId,
              source.reference.id,
            )}
          >
            Open source conversation
          </Link>{" "}
          � Approved {source.observedAt}
        </p>
      ))}
      {page?.availability === "available" && kind === "versions" ? (
        <>
          {!page.entries.length ? (
            <p>No retained versions are available in this page.</p>
          ) : null}
          {page.entries.map((entry) => (
            <article key={entry.id}>
              <h3>{entry.title}</h3>
              <p>
                {entry.status === "current" ? "Current" : "Superseded"} ·{" "}
                {entry.createdAt}
              </p>
              {entry.content.availability === "available" ? (
                <pre
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {entry.content.text}
                </pre>
              ) : (
                <p>
                  Content unavailable:{" "}
                  {entry.content.reason === "size_limit"
                    ? "display size limit"
                    : "canonical content unavailable"}
                  .
                </p>
              )}
            </article>
          ))}
          {page.nextCursor ? (
            <button
              type="button"
              className={ui.outline}
              onClick={() => void read(kind, page.nextCursor!)}
            >
              Next page
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
