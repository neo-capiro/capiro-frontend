import { useId } from "react";
import {
  ActionButton,
  Field,
  Panel,
  TextInput,
} from "../../../../../shared/module-ui";
import type { AssetUploadState } from "./use-asset-upload";
import { assetName } from "./AssetLibrary";
import styles from "./assets.module.css";

export function AssetUpload({
  upload,
  viewDetails,
  disabled = false,
}: {
  upload: AssetUploadState;
  viewDetails: (id: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.panel}>
      <Panel title="Add an image">
        <Field
          label="Image file"
          htmlFor={id}
          description="One PNG, JPEG, GIF or WebP, up to 10 MiB. Uploads are added to Unfiled. Selecting a file does not upload it."
          error={upload.error}
        >
          <TextInput
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            disabled={disabled || upload.pending || upload.unknown}
            onChange={(event) => upload.choose(event.target.files?.[0])}
          />
        </Field>
        {upload.file && (
          <p className={styles.file}>
            {upload.file.name} · {upload.file.type || "Unknown type"} ·{" "}
            {upload.file.size.toLocaleString()} bytes
          </p>
        )}
        {upload.pending && (
          <p role="status">
            Uploading… Closing this dialog does not undo the upload.
          </p>
        )}
        {upload.unknown && (
          <p role="alert" className={styles.notice}>
            Upload not confirmed. It may have completed. Refresh the image
            library before starting another upload.
          </p>
        )}
        {upload.item && (
          <div role="status" className={styles.item}>
            <p>Added to the library: {assetName(upload.item.name)}</p>
            <p>{upload.item.mimeType}</p>
            <ActionButton onClick={() => viewDetails(upload.item!.id)}>
              View uploaded image details
            </ActionButton>
          </div>
        )}
        <ActionButton
          primary
          disabled={
            disabled ||
            !upload.file ||
            !!upload.error ||
            upload.pending ||
            upload.unknown ||
            !!upload.item
          }
          onClick={() => void upload.upload()}
        >
          Upload
        </ActionButton>
      </Panel>
    </div>
  );
}
