"use client";

import { useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";

/** Recover only the receipt already returned to this mounted document view. */
export function useHillDayExport(documentId: string) {
  const api = useCapiro();
  const create = useCapiroMutation("workspace.hillday.export");
  const known = create.data;
  const status = useCapiroQuery(
    "workspace.hillday.export.status",
    { params: { id: documentId, exportId: known?.exportId ?? "" } },
    { enabled: !!known && known.documentId === documentId },
  );
  const mismatch =
    (known && known.documentId !== documentId) ||
    (status.data &&
      (status.data.documentId !== documentId ||
        status.data.exportId !== known?.exportId));
  // A failed/currently pending read must never expose the previous grant.
  const receipt = !mismatch ? status.data : undefined;
  const [now, setNow] = useState(Date.now);
  const expires = receipt?.expiresAt
    ? Date.parse(receipt.expiresAt)
    : Number.NaN;
  const expired = Number.isFinite(expires) && expires <= now;
  useEffect(() => {
    if (!Number.isFinite(expires)) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(0, expires - Date.now()), 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [expires]);
  useEffect(() => {
    if (receipt?.status !== "queued" || status.loading) return;
    const timer = setTimeout(status.reload, 2000);
    return () => clearTimeout(timer);
  }, [receipt, status.loading, status.reload]);

  const active = useRef<AbortController | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => () => active.current?.abort(), [api]);
  const canDownload =
    receipt?.status === "ready" &&
    !!receipt.url &&
    Number.isFinite(expires) &&
    !expired;

  async function generate(pageSize: "letter" | "a4") {
    if (known || create.pending || create.error) return;
    try {
      await create.run({ params: { id: documentId }, body: { pageSize } });
    } catch {
      // The mutation owner exposes errors. Never replay an uncertain POST.
    }
  }
  function refresh() {
    if (!known || status.loading || active.current) return;
    setDownloadError("");
    status.reload();
  }
  async function download() {
    if (!canDownload || !receipt?.url || active.current) return;
    // Check the clock at the action as well as when the expiry timer renders.
    if (expires <= Date.now()) {
      setNow(Date.now());
      return;
    }
    const search = new URL(receipt.url, window.location.origin).searchParams;
    const controller = new AbortController();
    active.current = controller;
    setDownloading(true);
    setDownloadError("");
    try {
      const result = await api.download(
        "workspace.hillday.download",
        {
          params: { id: documentId, exportId: receipt.exportId },
          query: { exp: search.get("exp") ?? "", sig: search.get("sig") ?? "" },
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(result.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (!controller.signal.aborted)
        setDownloadError(
          error instanceof Error ? error.message : "Download failed.",
        );
    } finally {
      if (!controller.signal.aborted) setDownloading(false);
      if (active.current === controller) active.current = null;
    }
  }
  return {
    known: !!known,
    creating: create.pending,
    createError: create.error,
    checking: !!known && status.loading,
    error: mismatch
      ? "The export receipt does not match this document and export."
      : status.error?.message,
    receipt,
    expired,
    canDownload,
    downloading,
    downloadError,
    generate,
    refresh,
    download,
  };
}
