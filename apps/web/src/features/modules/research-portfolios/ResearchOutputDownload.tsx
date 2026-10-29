"use client";
import { useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { ActionButton, StatusPanel } from "../../../shared/module-ui";

/** Download uses the saved artifact ID, never an inferred output job identity. */
export function ResearchOutputDownload({
  portfolioId,
  outputId,
  disabled = false,
}: {
  portfolioId: string;
  outputId: string;
  disabled?: boolean;
}) {
  const api = useCapiro();
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  useEffect(() => () => active.current?.abort(), [api, portfolioId, outputId]);
  async function download() {
    if (active.current && !active.current.signal.aborted) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.download(
        "research.outputs.download",
        { params: { id: portfolioId, outputId } },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error ? failure : new Error("Download failed"),
        );
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <ActionButton disabled={disabled || busy} onClick={() => void download()}>
        Download CSV
      </ActionButton>
      <StatusPanel error={error} />
    </>
  );
}
