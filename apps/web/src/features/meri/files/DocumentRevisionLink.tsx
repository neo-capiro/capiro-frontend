"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@capiro/ui/button";
import type { DocumentLibraryAccess } from "../../../shared/meri-documents/library-access";
import { revisionHandoff } from "../../../shared/meri-documents/revision-handoff";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";

/** Re-inspect on the selection action; a prior library row or inspection is never a write grant. */
export function DocumentRevisionLink({
  port,
  versionId,
  office = false,
}: {
  port: DocumentLibraryAccess;
  versionId: string;
  /** An Office version: Meri reads it as the selected document and proposes bounded edits to apply. */
  office?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [problem, setProblem] = useState<string>();
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );
  const select = async () => {
    if (busy) return;
    const current = new AbortController();
    pending.current = current;
    setBusy(true);
    setProblem(undefined);
    setReady(false);
    try {
      const reply = await port.inspect(versionId, current.signal);
      if (current.signal.aborted) return;
      if (
        !reply.ok ||
        reply.value.kind !== "generated" ||
        reply.value.versionId !== versionId
      )
        throw Error("Source unavailable");
      revisionHandoff(port.context).write(reply.value);
      setReady(true);
    } catch {
      if (!current.signal.aborted)
        setProblem(
          "This version could not be selected for revision under current access.",
        );
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  };
  return (
    <div>
      <Button variant="outline" disabled={busy} onClick={() => void select()}>
        {office
          ? "Ask Meri about this document"
          : "Select version for revision"}
      </Button>
      {office && (
        <p>
          Meri reads exactly this saved version and proposes changes you apply
          yourself; Save keeps a private draft, Publish makes the file version
          Meri can read.
        </p>
      )}
      {ready && (
        <p>
          <Link
            prefetch={false}
            href={conversationHref(
              port.context.selectedClientId,
              port.context.conversationId,
            )}
          >
            {office
              ? "Continue with Meri in the original conversation"
              : "Review revision in the original conversation"}
          </Link>
        </p>
      )}
      {problem && <p role="alert">{problem}</p>}
    </div>
  );
}
