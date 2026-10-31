"use client";

import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { SelectField } from "../components";
import type { EvidenceScope } from "./EvidenceActions";
export function useEvidenceScope(folderId: string) {
  const folders = useCapiroQuery("legiwatch.folders", {});
  const visible = (folders.data ?? []).filter(
    (folder) => !folder.archived && folder.jurisdiction === "FL",
  );
  const selected = visible.find((folder) => folder.id === folderId);
  const scope: EvidenceScope = selected
    ? {
        folderId: selected.id,
        ...(selected.clientId ? { clientId: selected.clientId } : {}),
        sessionKey: selected.defaultSession,
      }
    : {};
  return {
    folders,
    visible,
    selected,
    scope,
  };
}
export function EvidenceScopePicker({
  value,
  onChange,
  state,
}: {
  value: string;
  onChange: (value: string) => void;
  state: ReturnType<typeof useEvidenceScope>;
}) {
  const { folders, visible } = state;
  return (
    <div>
      <SelectField
        id="evidence-folder"
        label="Client / folder"
        value={value}
        onChange={onChange}
      >
        <option value="">All retained sources</option>
        {visible.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </SelectField>
      {folders.error && (
        <p role="alert">
          Folder access could not be loaded. Saving is unavailable.
        </p>
      )}
    </div>
  );
}
