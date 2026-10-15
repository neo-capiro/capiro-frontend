"use client";
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
  FileTreeName,
} from "@capiro/ui/file-tree";
import type { WorkspaceFileGroup, WorkspaceFileRow } from "./types";
import styles from "./workspace-files.module.css";

/** Adopted FileTree: Inputs, Working and Published groups; selecting a file opens its card. */
export function WorkspaceFileTree({
  groups,
  files,
  selectedId,
  onSelect,
}: {
  groups: readonly WorkspaceFileGroup[];
  files: readonly WorkspaceFileRow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(files.map((file) => [file.id, file]));
  return (
    <FileTree
      className={styles.tree}
      aria-label="Workspace files"
      defaultExpanded={new Set(groups.map((group) => group.id))}
      selectedPath={selectedId}
      onSelect={(path) => {
        if (byId.has(path)) onSelect(path);
      }}
    >
      {groups.map((group) => (
        <FileTreeFolder
          key={group.id}
          path={group.id}
          name={`${group.label} · ${group.fileIds.length}`}
        >
          {group.fileIds.map((id) => {
            const file = byId.get(id);
            return file ? (
              <FileTreeFile
                key={id}
                path={id}
                name={file.name}
                className={styles.file}
                aria-selected={id === selectedId}
              >
                <FileTreeName>{file.name}</FileTreeName>
              </FileTreeFile>
            ) : null;
          })}
        </FileTreeFolder>
      ))}
    </FileTree>
  );
}
