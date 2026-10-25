"use client";
import { useState } from "react";
import type { Destinations } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClient } from "@/features/portfolio/index/public";
import { useFiles } from "./queries";
import { filterFiles, type Attachment } from "./contracts";
import { DeleteFile } from "./DeleteFile";
import { FileToolbar } from "./FileToolbar";
import { FileSelectionBar } from "./FileSelectionBar";
import { FolderCards } from "./FolderCards";
import { FileTable, type FileAction } from "./FileTable";
import { FilePreview } from "./FilePreview";
import { FileAccess } from "./FileAccess";
import { useFileAccessAttempt } from "./mutations";
import { MoveFile } from "./MoveFile";
import { MoveFiles } from "./MoveFiles";
import { useBatchMoveAttempt } from "./useBatchMove";
import { UploadDialog } from "./UploadDialog";
import { FileStorageUsage } from "./FileStorageUsage";
import { DocumentState } from "./DocumentState";
import { useLinkedFileArrival } from "./linked-arrival";
import styles from "./files.module.css";
export function FilesPage({
  clientId,
  destinations,
  linkedFileId,
}: {
  clientId: string;
  destinations: Destinations;
  linkedFileId?: string;
}) {
  const query = useFiles(clientId);
  const arrival = useLinkedFileArrival(clientId, linkedFileId, query);
  const client = useClient(clientId);
  const [filters, setFilters] = useState<{
    view: string;
    search: string;
    folder?: string;
    source: string;
    sort: string;
    mode: "files" | "folders";
  }>({
    view: query.readerScope,
    search: "",
    source: "",
    sort: "created",
    mode: "files",
  });
  const currentFilters =
    filters.view === query.readerScope
      ? filters
      : {
          view: query.readerScope,
          search: "",
          source: "",
          sort: "created",
          mode: "files" as const,
          folder: undefined,
        };
  const { search, folder, source, sort, mode } = currentFilters;
  const changeFilters = (value: Partial<typeof currentFilters>) =>
    setFilters({ ...currentFilters, ...value });
  const setFolder = (value: string | undefined) =>
    changeFilters({ folder: value, mode: "files" });
  const [checked, setChecked] = useState<{ view: string; ids: string[] }>();
  const batchAttempt = useBatchMoveAttempt(clientId);
  const accessAttempt = useFileAccessAttempt(clientId);
  const [batch, setBatch] = useState<{ view: string; files: Attachment[] }>();
  const selected = checked?.view === query.readerScope ? checked.ids : [];
  const [requestedAction, setAction] = useState<{
    view: string;
    kind: FileAction | "new-folder";
    id: string;
  }>();
  const [uploadView, setUploadView] = useState<string>();
  const [folderAccess, setFolderAccess] = useState<{
    view: string;
    folder: string | null;
    files: Attachment[];
    operation: "file-access" | "folder-access";
  }>();
  const requestAction = (kind: FileAction | "new-folder", id: string) => {
    arrival.dismiss();
    if (kind === "access") {
      const file = query.data?.find((item) => item.id === id);
      if (file)
        setFolderAccess({
          view: query.readerScope,
          folder: file.folder,
          files: [structuredClone(file)],
          operation: "file-access",
        });
      return;
    }
    setAction({ view: query.readerScope, kind, id });
  };
  const close = () => {
    arrival.dismiss();
    setAction(undefined);
  };
  const available = query.isSuccess && !query.error;
  const files = available ? query.data : [];
  const currentFile =
    requestedAction?.view === query.readerScope
      ? files.find((file) => file.id === requestedAction.id)
      : undefined;
  const action = arrival.file
    ? { kind: "preview" as const, file: arrival.file }
    : requestedAction && currentFile
      ? { kind: requestedAction.kind, file: currentFile }
      : undefined;
  const rows = filterFiles(files, search, folder, source, sort);
  const folders = [
    ...new Set(files.flatMap((file) => (file.folder ? [file.folder] : []))),
  ].sort();
  const chosen = files.filter((f) => selected.includes(f.id));
  return (
    <div className="page stack">
      <header className="row between">
        <h1>Client files</h1>
        <div className="row">
          <button
            className="button"
            disabled={chosen.length !== 1}
            title="Select one file to create a shared folder label"
            onClick={() => {
              if (chosen[0]) requestAction("new-folder", chosen[0].id);
            }}
          >
            New folder
          </button>
          <button
            className="button"
            onClick={() => {
              arrival.dismiss();
              setUploadView(query.readerScope);
            }}
            disabled={!available}
          >
            Upload
          </button>
          <button
            className="button primary"
            disabled
            title="Meri starter contract is awaiting coordination"
          >
            Create with Meri
          </button>
        </div>
      </header>
      <FileToolbar
        search={search}
        source={source}
        sources={[...new Set(files.map((file) => file.source))]}
        sort={sort}
        onSearch={(search) => changeFilters({ search })}
        onSource={(source) => changeFilters({ source })}
        onSort={(sort) => changeFilters({ sort })}
      />
      {batchAttempt && (
        <button
          className="button"
          onClick={() => {
            arrival.dismiss();
            setBatch({
              view: query.readerScope,
              files: files.filter((file) =>
                batchAttempt.command.files.some(
                  (entry) => entry.id === file.id,
                ),
              ),
            });
          }}
        >
          Review pending move
        </button>
      )}
      {accessAttempt && (
        <button
          className="button"
          onClick={() => {
            arrival.dismiss();
            setFolderAccess({
              view: query.readerScope,
              folder: accessAttempt.command.folder,
              files: files.filter((file) =>
                accessAttempt.command.files.some(
                  (entry) => entry.id === file.id,
                ),
              ),
              operation: accessAttempt.command.operation,
            });
          }}
        >
          Review pending access change
        </button>
      )}
      <div className={styles.viewMode} role="group" aria-label="File view">
        <button
          className="button"
          aria-pressed={mode === "folders"}
          onClick={() => changeFilters({ mode: "folders", folder: undefined })}
        >
          Folders
        </button>
        <button
          className="button"
          aria-pressed={mode === "files"}
          onClick={() => setFolder(undefined)}
        >
          All files
        </button>
      </div>
      {arrival.unavailable && (
        <DocumentState>
          This file is unavailable in the current list.
        </DocumentState>
      )}
      <div className={styles.layout}>
        <aside className={`card stack ${styles.folders}`}>
          <header className="row between">
            <span className="eyebrow">Folders</span>
            <button
              className="button ghost"
              disabled={!available || folder === undefined}
              onClick={() => {
                arrival.dismiss();
                setFolderAccess({
                  view: query.readerScope,
                  folder: folder || null,
                  files: structuredClone(
                    files.filter((file) => file.folder === (folder || null)),
                  ),
                  operation: "folder-access",
                });
              }}
            >
              Access
            </button>
          </header>
          {available ? (
            <>
              <button
                className="button ghost"
                aria-pressed={folder === undefined}
                onClick={() => setFolder(undefined)}
              >
                {client.data?.name ?? "All files"} · {files.length}
              </button>
              {[...folders, ""].map((name) => (
                <button
                  key={name}
                  className="button ghost"
                  aria-pressed={folder === name}
                  onClick={() => setFolder(name)}
                >
                  <span className={styles.folderIcon} />
                  {name || "Unfiled"}
                  <small>
                    {files.filter((f) => f.folder === (name || null)).length}
                  </small>
                </button>
              ))}
            </>
          ) : (
            <small>
              {query.isPending ? "Loading folders…" : "Folders unavailable."}
            </small>
          )}
          <hr className="divider" />
          <FileStorageUsage clientId={clientId} />
        </aside>
        <section
          className={styles.results}
          aria-label={
            folder === undefined
              ? "All client files"
              : `Folder ${folder || "Unfiled"}`
          }
        >
          {available ? (
            <>
              <header className={styles.folderHeading}>
                <div className={styles.breadcrumb}>
                  <button onClick={() => setFolder(undefined)}>
                    {client.data?.name ?? "All files"}
                  </button>
                  {folder !== undefined && (
                    <>
                      <span aria-hidden="true">›</span>
                      <strong>{folder || "Unfiled"}</strong>
                    </>
                  )}
                  <small>{rows.length} files</small>
                </div>
                <button
                  className="button"
                  disabled={!available || Boolean(folder)}
                  title={
                    folder
                      ? "Upload first, then move the saved file into this folder."
                      : undefined
                  }
                  onClick={() => {
                    arrival.dismiss();
                    setUploadView(query.readerScope);
                  }}
                >
                  Upload here
                </button>
              </header>
              {folder && (
                <p className={styles.folderHint}>
                  Upload first, then use Move to folder. Uploads cannot be
                  placed directly in a named folder.
                </p>
              )}
              {mode === "folders" ? (
                <FolderCards files={rows} onOpen={setFolder} />
              ) : (
                <>
                  <FileSelectionBar
                    visibleCount={rows.length}
                    selectedCount={chosen.length}
                    hiddenSelectedCount={
                      chosen.filter(
                        (file) => !rows.some((row) => row.id === file.id),
                      ).length
                    }
                    onClear={() =>
                      setChecked({ view: query.readerScope, ids: [] })
                    }
                    onMove={() => {
                      if (chosen.length > 1 && chosen.length <= 100) {
                        arrival.dismiss();
                        setBatch({
                          view: query.readerScope,
                          files: structuredClone(chosen),
                        });
                      } else if (chosen[0]) requestAction("move", chosen[0].id);
                    }}
                  />
                  <FileTable
                    files={rows}
                    selected={selected}
                    onSelect={(ids) =>
                      setChecked({ view: query.readerScope, ids })
                    }
                    onAction={(kind, file) => requestAction(kind, file.id)}
                  />
                </>
              )}
            </>
          ) : (
            <QueryState
              pending={query.isPending}
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
        </section>
      </div>
      {action?.kind === "preview" && (
        <FilePreview
          key={`${action.file.id}:${action.file.lifecycleStatus}:${action.file.scanStatus}`}
          clientId={clientId}
          file={action.file}
          onClose={close}
        />
      )}
      {folderAccess?.view === query.readerScope && (
        <FileAccess
          key={`${query.readerScope}:${folderAccess.operation}:${JSON.stringify(folderAccess.files.map((file) => file.id))}`}
          clientId={clientId}
          folder={folderAccess.folder}
          files={folderAccess.files}
          operation={folderAccess.operation}
          onClose={() => setFolderAccess(undefined)}
        />
      )}
      {(action?.kind === "move" || action?.kind === "new-folder") && (
        <MoveFile
          clientId={clientId}
          file={action.file}
          folders={folders}
          creating={action.kind === "new-folder"}
          onClose={close}
        />
      )}
      {batch?.view === query.readerScope && available && (
        <MoveFiles
          key={query.readerScope}
          clientId={clientId}
          files={batch.files}
          currentFiles={files}
          folders={folders}
          onClose={() => setBatch(undefined)}
          onSaved={() => {
            setBatch(undefined);
            setChecked({ view: query.readerScope, ids: [] });
          }}
        />
      )}
      {requestedAction?.kind === "delete" &&
        requestedAction.view === query.readerScope &&
        available && (
          <DeleteFile
            key={`${query.readerScope}:${requestedAction.id}`}
            clientId={clientId}
            id={requestedAction.id}
            fileName={currentFile?.fileName}
            onClose={close}
          />
        )}
      {uploadView === query.readerScope && available && (
        <UploadDialog
          clientId={clientId}
          onClose={() => setUploadView(undefined)}
        />
      )}
      {!destinations.meri && <small>Meri destination is not configured.</small>}
    </div>
  );
}
