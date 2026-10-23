"use client";
import { useState } from "react";
import type { Destinations } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClient } from "@/features/portfolio/index/public";
import { useFiles } from "./queries";
import { filterFiles } from "./contracts";
import { DeleteFile } from "./DeleteFile";
import { FileToolbar } from "./FileToolbar";
import { FileSelectionBar } from "./FileSelectionBar";
import { FolderCards } from "./FolderCards";
import { FileTable, type FileAction } from "./FileTable";
import { FilePreview } from "./FilePreview";
import { FileAccess } from "./FileAccess";
import { MoveFile } from "./MoveFile";
import { BatchMoveDialog } from "./BatchMoveDialog";
import { useBatchMove } from "./useBatchMove";
import type { Attachment } from "./contracts";
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
  const batch = useBatchMove(clientId);
  const [batchSelection, setBatchSelection] = useState<{
    view: string;
    files: Attachment[];
  }>();
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
  }>();
  const requestAction = (kind: FileAction | "new-folder", id: string) => {
    arrival.dismiss();
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
  const batchOpen = batchSelection?.view === query.readerScope;
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
      {batch.pending && !batchOpen && (
        <div role="status">
          <p>
            A previous file batch is unconfirmed. Recover its exact result
            before another batch.
          </p>
          <button
            className="button"
            disabled={batch.busy}
            onClick={batch.recover}
          >
            Check batch result
          </button>
        </div>
      )}
      {batch.error && !batchOpen && <p role="alert">{batch.error}</p>}
      {batch.confirmed && !batchOpen && (
        <p role="status">
          {batch.confirmed} Current file organization may have changed since
          that receipt.
        </p>
      )}
      <FileToolbar
        search={search}
        source={source}
        sources={[...new Set(files.map((file) => file.source))]}
        sort={sort}
        onSearch={(search) => changeFilters({ search })}
        onSource={(source) => changeFilters({ source })}
        onSort={(sort) => changeFilters({ sort })}
      />
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
                    moveUnavailable={
                      chosen.length > 1
                        ? chosen.length > 100
                          ? "Select at most 100 files for one atomic move."
                          : chosen.some(
                                (file) => file.metadataRevision === undefined,
                              )
                            ? "Batch revisions are unavailable. Refresh after the file service contract is enabled."
                            : chosen.some(
                                  (file) =>
                                    file.sourceEntityType ===
                                    "hearing_record_brief",
                                )
                              ? "Hearing-backed documents require additional owner authorization before batch moves are available."
                              : batch.locked
                                ? "Check the retained batch or refresh the current file access before moving this selection."
                                : undefined
                        : undefined
                    }
                    hiddenSelectedCount={
                      chosen.filter(
                        (file) => !rows.some((row) => row.id === file.id),
                      ).length
                    }
                    onClear={() =>
                      setChecked({ view: query.readerScope, ids: [] })
                    }
                    onMove={() => {
                      if (chosen.length === 1 && chosen[0])
                        requestAction("move", chosen[0].id);
                      else if (chosen.length > 1 && !batch.locked) {
                        batch.begin();
                        setBatchSelection({
                          view: query.readerScope,
                          files: structuredClone(chosen),
                        });
                      }
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
      {action?.kind === "access" && (
        <FileAccess clientId={clientId} file={action.file} onClose={close} />
      )}
      {folderAccess?.view === query.readerScope && available && (
        <FileAccess
          clientId={clientId}
          folder={folderAccess.folder}
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
      {batchSelection?.view === query.readerScope && (
        <BatchMoveDialog
          clientId={clientId}
          files={batchSelection.files}
          folders={folders}
          move={batch}
          onClose={() => setBatchSelection(undefined)}
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
