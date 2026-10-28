"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@capiro/ui/button";
import type {
  ArtifactAccess,
  ArtifactPreview,
} from "../../../shared/meri-documents/artifact-access";
import {
  readArtifactSource,
  supportsSourceView,
} from "../../../shared/meri-documents/source-access";
import styles from "./files.module.css";

export function DocumentSourceText({ text }: { text: string }) {
  return (
    <pre
      tabIndex={0}
      aria-label="File source"
      style={{
        maxHeight: "32rem",
        maxWidth: "100%",
        overflow: "auto",
        whiteSpace: "pre",
      }}
    >
      <code>{text}</code>
    </pre>
  );
}

/** Native HTML/code is displayed as escaped text. Opening it never executes the file. */
export function DocumentSourcePanel({
  access,
  preview,
}: {
  access: ArtifactAccess;
  preview: Extract<ArtifactPreview, { kind: "native-file" }>;
}) {
  const [result, setResult] = useState<{
    access: ArtifactAccess;
    versionId: string;
    busy?: boolean;
    text?: string;
    message?: string;
  } | null>(null);
  const work = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      work.current?.abort();
      work.current = null;
    },
    [access, preview.versionId],
  );
  const shown =
    result?.access === access && result.versionId === preview.versionId
      ? result
      : null;
  async function read() {
    work.current?.abort();
    const controller = new AbortController();
    work.current = controller;
    setResult({ access, versionId: preview.versionId, busy: true });
    try {
      const reply = await readArtifactSource(
        access,
        preview,
        controller.signal,
      );
      if (controller.signal.aborted || work.current !== controller) return;
      setResult({
        access,
        versionId: preview.versionId,
        ...(reply.ok
          ? { text: reply.value }
          : {
              message: `Source unavailable (${reply.code}). The original download remains separate.`,
            }),
      });
    } catch {
      if (!controller.signal.aborted && work.current === controller)
        setResult({
          access,
          versionId: preview.versionId,
          message: "Source could not be read. No content was substituted.",
        });
    } finally {
      if (work.current === controller) work.current = null;
    }
  }
  if (!supportsSourceView(preview)) return null;
  return (
    <section aria-label="Source text" className={styles.stack}>
      <Button
        type="button"
        variant="outline"
        disabled={shown?.busy === true}
        onClick={() => void read()}
      >
        View source
      </Button>
      <p className={styles.muted}>
        HTML and code appear as text without execution. Source view supports
        UTF-8 files up to 256 KiB; download retains the original bytes.
      </p>
      {shown?.message && <p role="status">{shown.message}</p>}
      {shown?.text !== undefined && <DocumentSourceText text={shown.text} />}
    </section>
  );
}
