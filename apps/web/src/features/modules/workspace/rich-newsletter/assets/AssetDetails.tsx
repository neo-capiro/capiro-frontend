import { useId } from "react";
import { ActionButton, Field, Panel } from "../../../../../shared/module-ui";
import type { AssetManagementLauncher } from "./AssetFolders";
import type { AssetPickerState } from "./use-asset-picker";
import { assetName } from "./AssetLibrary";
import styles from "./assets.module.css";

export function AssetDetails({
  picker,
  manage,
  disabled,
  history,
}: {
  picker: AssetPickerState;
  history?: () => void;
} & AssetManagementLauncher) {
  const id = useId();
  if (picker.detailLoading) return <p role="status">Loading image details…</p>;
  if (picker.detailError || !picker.details)
    return (
      <p role="alert" className={styles.notice}>
        Image details could not be loaded. Go back and refresh the library.
      </p>
    );
  const item = picker.details;
  const fields = [
    ["Name", assetName(item.name)],
    ["File type", item.mimeType],
    ["File size", `${item.sizeBytes.toLocaleString()} bytes`],
    ["Uploaded", new Date(item.createdAt).toLocaleString()],
    ["Asset revision", String(item.revisionNumber)],
    ["Current revision", item.currentRevision ? "Yes" : "No"],
  ];
  return (
    <div className={styles.panel}>
      <Panel title="File information">
        <div className={styles.fields}>
          {fields.map(([label, value], index) => (
            <Field key={label} label={label!} htmlFor={`${id}-${index}`}>
              <output id={`${id}-${index}`} className={styles.value}>
                {value}
              </output>
            </Field>
          ))}
        </div>
        {!item.currentRevision && (
          <p role="alert" className={styles.notice}>
            This is no longer a current image. Go back and refresh the library
            to choose a current image.
          </p>
        )}
        {(manage || history) && (
          <div className={styles.actions}>
            {manage && (
              <>
                <ActionButton
                  data-asset-focus="renameImage"
                  disabled={disabled || !item.currentRevision}
                  onClick={() => manage({ kind: "renameImage", image: item })}
                >
                  Rename image
                </ActionButton>
                <ActionButton
                  data-asset-focus="deleteImage"
                  disabled={disabled || !item.currentRevision}
                  onClick={() => manage({ kind: "deleteImage", image: item })}
                >
                  Delete image
                </ActionButton>
              </>
            )}
            {history && (
              <ActionButton data-asset-focus="history" onClick={history}>
                Revision History
              </ActionButton>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
