"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useFileScope } from "./file-scope";
import {
  currentFileHistoryDestination,
  readFileHistory,
} from "./history-access";
import { useFileNavigation } from "./navigation";
import type { FileHistoryPage, FileHistoryRequest } from "./history-contract";

export function FileVersionHistory({
  clientId,
  attachmentId,
}: {
  clientId: string;
  attachmentId: string;
}) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useFileScope(clientId, `history:${attachmentId}`);
  const pending = useRef<AbortSignal | null>(null);
  const [state, setState] = useState<{
    scope: string;
    page?: FileHistoryPage;
    request?: FileHistoryRequest;
    pending?: boolean;
    error?: Error;
  }>();
  const visible =
    state?.scope === scope.key && scope.canRead ? state : undefined;
  const page = visible?.page;
  const navigation = useFileNavigation(
    clientId,
    `history:${attachmentId}:${page?.headId ?? ""}:${page?.offset ?? ""}`,
    (reader, queryCache, selectedClient, selected, kind, execution) => {
      if (!visible?.request)
        throw new Error("Refresh this history page before opening a version.");
      return currentFileHistoryDestination(
        reader,
        queryCache,
        selectedClient,
        visible.request,
        selected,
        kind,
        execution,
      );
    },
  );
  async function load(next = false) {
    if (pending.current && !pending.current.aborted) return;
    let signal: AbortSignal | undefined;
    try {
      const execution = scope.capture();
      signal = execution.signal;
      pending.current = signal;
      const request: FileHistoryRequest = {
        attachmentId,
        cursor: next && page ? page.nextCursor : null,
        offset: next && page ? page.offset + page.versions.length : 0,
        ...(next && page ? { previous: page } : {}),
      };
      if (next && !request.cursor) return;
      setState({ scope: scope.key, pending: true });
      const result = await readFileHistory(
        api,
        cache,
        clientId,
        request,
        execution,
      );
      execution.guard();
      setState({
        scope: scope.key,
        page: result,
        request: { ...request, previous: result },
      });
    } catch (error) {
      if (!signal?.aborted)
        setState({
          scope: scope.key,
          error:
            error instanceof Error
              ? error
              : new Error("File history is unavailable."),
        });
    } finally {
      if (pending.current === signal) pending.current = null;
    }
  }
  return (
    <section className="stack" aria-label="File version history">
      <h3>Version history</h3>
      <p>
        Saved file records, oldest first. Opening a version checks current
        access again. Issued links expire after five minutes.
      </p>
      <button
        className="button"
        disabled={
          !scope.canRead || visible?.pending || Boolean(navigation.pendingId)
        }
        onClick={() => void load()}
      >
        {visible?.pending
          ? "Reading history…"
          : page
            ? "Refresh history"
            : "Load history"}
      </button>
      <QueryState error={visible?.error} />
      <QueryState error={navigation.error} />
      {navigation.pendingId && (
        <p role="status">Checking current version access…</p>
      )}
      {page && (
        <>
          <p role="status">
            Versions {page.offset + 1}–{page.offset + page.versions.length} of{" "}
            {page.versionCount}
          </p>
          <ol start={page.offset + 1}>
            {page.versions.map((item) => (
              <li key={item.attachmentId}>
                <strong>{item.fileName}</strong>{" "}
                {item.isCurrent
                  ? "Current version"
                  : item.isOriginal
                    ? "Original version"
                    : "Earlier version"}
                <p>
                  {new Date(item.createdAt).toLocaleString()} ·{" "}
                  {item.uploadedByName ?? "Unknown uploader"}
                </p>
                <p>
                  {item.contentType} ·{" "}
                  {item.byteSize === null
                    ? "Size unavailable"
                    : `${item.byteSize} bytes`}
                </p>
                <p>
                  {item.usable
                    ? "File record available"
                    : (item.blockedReason ?? item.lifecycleStatus)}
                </p>
                {item.scanDisclosure && <p>{item.scanDisclosure}</p>}
                {item.usable && (item.downloadUrl || item.previewUrl) ? (
                  <div className="row">
                    {item.previewUrl && (
                      <button
                        type="button"
                        role="link"
                        className="button"
                        disabled={
                          !navigation.canRead || Boolean(navigation.pendingId)
                        }
                        onClick={() =>
                          void navigation.navigate(
                            { id: item.attachmentId, source: item.source },
                            "preview",
                          )
                        }
                      >
                        Open this version
                      </button>
                    )}
                    {item.downloadUrl && (
                      <button
                        type="button"
                        role="link"
                        className="button"
                        disabled={
                          !navigation.canRead || Boolean(navigation.pendingId)
                        }
                        onClick={() =>
                          void navigation.navigate(
                            { id: item.attachmentId, source: item.source },
                            "download",
                          )
                        }
                      >
                        Download this version
                      </button>
                    )}
                  </div>
                ) : (
                  <p>Original bytes are unavailable for this version.</p>
                )}
              </li>
            ))}
          </ol>
          {page.hasMore && (
            <button className="button" onClick={() => void load(true)}>
              Next versions
            </button>
          )}
          {page.offset > 0 && (
            <button className="button" onClick={() => void load()}>
              First versions
            </button>
          )}
        </>
      )}
    </section>
  );
}
