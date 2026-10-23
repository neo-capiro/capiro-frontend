"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function TaskAttachments({
  taskId,
  writable,
  onStateChange,
}: {
  taskId: string;
  writable: boolean;
  onStateChange?: (state: { pending: boolean; error?: string }) => void;
}) {
  const api = useCapiro();
  const query = useCapiroQuery("planner.task.attachments", {
    params: { taskId },
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const [writeError, setWriteError] = useState<string>();
  useLayoutEffect(() => {
    onStateChange?.({ pending: busy, error: writeError ?? error });
    return () => onStateChange?.({ pending: false });
  }, [busy, error, writeError, onStateChange]);
  const upload = async (file: File) => {
    setBusy(true);
    setError(undefined);
    try {
      await api.upload(
        "planner.task.attachment.upload",
        { params: { taskId } },
        [{ field: "file", file }],
      );
      query.reload();
      if (fileInput.current) fileInput.current.value = "";
    } catch (cause) {
      setWriteError(
        cause instanceof Error ? cause.message : "Unable to upload attachment.",
      );
    } finally {
      setBusy(false);
    }
  };
  const archive = async (id: string, archived: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.task.attachment.archive", {
        params: { taskId, id },
        body: { archived },
      });
      query.reload();
    } catch (cause) {
      setWriteError(
        cause instanceof Error ? cause.message : "Unable to update attachment.",
      );
    } finally {
      setBusy(false);
    }
  };
  const download = async (id: string, fileName: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.download("planner.task.attachment.download", {
        params: { taskId, id },
      });
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to download attachment.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel
      title="Attachments"
      description="Files up to 25 MiB; backend checks task access for every transfer."
      actions={
        <ActionButton
          disabled={!writable || busy}
          onClick={() => fileInput.current?.click()}
        >
          Upload attachment
        </ActionButton>
      }
    >
      <input
        type="file"
        ref={fileInput}
        aria-label="Task attachment file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <AttachmentList
        query={query}
        error={writeError ?? error}
        busy={busy}
        writable={writable}
        download={download}
        archive={archive}
      />
    </Panel>
  );
}

function AttachmentList({
  query,
  error,
  busy,
  writable,
  download,
  archive,
}: {
  query: ReturnType<typeof useCapiroQuery<"planner.task.attachments">>;
  error?: string;
  busy: boolean;
  writable: boolean;
  download: (id: string, name: string) => Promise<void>;
  archive: (id: string, value: boolean) => Promise<void>;
}) {
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      <div className={styles.detail}>
        {query.data?.map((file) => (
          <div key={file.id} className={styles.tools}>
            <span>
              {file.fileName} · {Math.ceil(file.sizeBytes / 1024)} KiB
            </span>
            {file.archived && <Badge>Archived</Badge>}
            <ActionButton
              disabled={busy || file.archived}
              onClick={() => void download(file.id, file.fileName)}
            >
              Download
            </ActionButton>
            <ActionButton
              disabled={busy || !writable}
              onClick={() => void archive(file.id, !file.archived)}
            >
              {file.archived ? "Restore" : "Archive"}
            </ActionButton>
          </div>
        ))}
        {query.data?.length === 0 && (
          <p className={styles.muted}>No attachments yet.</p>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </StatusPanel>
  );
}
