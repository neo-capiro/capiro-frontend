import type { RefObject } from "react";
import { SettingsButton } from "../components";
import styles from "../styles";

export function SignatureUpload({
  upload,
  disabled,
  readFile,
}: {
  upload: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  readFile: (file?: File) => void;
}) {
  return (
    <div
      className={styles.dropzone}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void readFile(event.dataTransfer.files[0]);
      }}
    >
      <h3>Upload a signature image or HTML file</h3>
      <p className={styles.description}>
        Drag and drop, or browse. Image (PNG, JPG, GIF, WEBP) or .html / .htm
      </p>
      <SettingsButton
        disabled={disabled}
        onClick={() => upload.current?.click()}
      >
        Browse file
      </SettingsButton>
      <input
        ref={upload}
        type="file"
        hidden
        disabled={disabled}
        accept="image/png,image/jpeg,image/gif,image/webp,.html,.htm"
        onChange={(event) => {
          void readFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
