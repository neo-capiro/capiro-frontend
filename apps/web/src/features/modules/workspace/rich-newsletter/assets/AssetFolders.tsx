import { useId } from "react";
import {
  ActionButton,
  Field,
  SelectInput,
} from "../../../../../shared/module-ui";
import type { AssetManagementAction } from "./asset-management";
import type { AssetPickerState } from "./use-asset-picker";
import styles from "./assets.module.css";

export type AssetManagementLauncher = {
  manage: (action: AssetManagementAction) => void;
  disabled: boolean;
};
export function AssetFolders({
  picker,
  manage,
  disabled,
}: { picker: AssetPickerState } & AssetManagementLauncher) {
  const id = useId();
  const { folders, selectedFolder, selectedImage } = picker;
  const unavailable =
    picker.query.folder && picker.query.folder !== "unfiled" && !selectedFolder;
  return (
    <div className={styles.folderControls}>
      <Field label="Folder" htmlFor={id}>
        <SelectInput
          id={id}
          value={picker.query.folder ?? ""}
          options={[
            { value: "", label: "All files" },
            { value: "unfiled", label: "Unfiled" },
            ...(folders.data?.items.map((folder) => ({
              value: folder.id,
              label: folder.name,
            })) ?? []),
            ...(unavailable
              ? [
                  {
                    value: picker.query.folder!,
                    label: "Folder unavailable",
                    disabled: true,
                  },
                ]
              : []),
          ]}
          onValueChange={(folder) =>
            picker.changeQuery({ folder: folder || undefined })
          }
        />
      </Field>
      {folders.loading && <p role="status">Loading folders…</p>}
      {folders.error && (
        <p role="alert" className={styles.notice}>
          Folders unavailable. Refresh the library to try this read again.
        </p>
      )}
      <div className={styles.actions}>
        <ActionButton
          data-asset-focus="importImage"
          disabled={disabled || !!unavailable}
          onClick={() =>
            manage({ kind: "importImage", folder: selectedFolder })
          }
        >
          Import URL
        </ActionButton>
        <ActionButton
          data-asset-focus="createFolder"
          disabled={disabled}
          onClick={() => manage({ kind: "createFolder" })}
        >
          Add Folder
        </ActionButton>
        <ActionButton
          data-asset-focus="moveImage"
          disabled={disabled || !selectedImage || !folders.data}
          onClick={() =>
            selectedImage && manage({ kind: "moveImage", image: selectedImage })
          }
        >
          Move to folder
        </ActionButton>
        <ActionButton
          data-asset-focus="renameFolder"
          disabled={disabled || !selectedFolder}
          onClick={() =>
            selectedFolder &&
            manage({ kind: "renameFolder", folder: selectedFolder })
          }
        >
          Rename Folder
        </ActionButton>
        <ActionButton
          data-asset-focus="deleteFolder"
          disabled={disabled || !selectedFolder}
          onClick={() =>
            selectedFolder &&
            manage({ kind: "deleteFolder", folder: selectedFolder })
          }
        >
          Delete Folder
        </ActionButton>
      </div>
    </div>
  );
}
