import { useId } from "react";
import { Field, Panel } from "../../../../../shared/module-ui";
import type { AssetPickerState } from "./use-asset-picker";
import { assetName } from "./AssetLibrary";
import styles from "./assets.module.css";

export function AssetDetails({ picker }: { picker: AssetPickerState }) {
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
      </Panel>
    </div>
  );
}
