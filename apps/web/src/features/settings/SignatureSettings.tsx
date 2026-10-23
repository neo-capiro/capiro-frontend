"use client";

import { useEffect, useRef, useState } from "react";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { StatusPanel } from "../../shared/module-ui";
import {
  SettingsButton,
  SettingsCard,
  SettingsNewBadge,
  SettingsNotice,
  SettingsSwitch,
} from "./components";
import { RichSignatureEditor } from "./signature/RichSignatureEditor";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

const signatureLimit = 18_000_000;
const allowedImages = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

function SignatureEditor({
  initialHtml,
  initialEnabled,
  reload,
}: {
  initialHtml: string | null;
  initialEnabled: boolean;
  reload: () => void;
}) {
  const mutation = useSettingsMutation("signature");
  const { api, action } = mutation;
  const [html, setHtml] = useState(initialHtml ?? "");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [fileError, setFileError] = useState<string>();
  const upload = useRef<HTMLInputElement>(null);
  const fileReader = useRef<FileReader | null>(null);
  const [reading, setReading] = useState(false);
  const [readerScope, setReaderScope] = useState(api);
  if (readerScope !== api) {
    setReaderScope(api);
    setReading(false);
    setHtml(initialHtml ?? "");
    setEnabled(initialEnabled);
    setFileError(undefined);
  }
  const locked = mutation.locked || reading;
  useEffect(() => {
    return () => {
      const reader = fileReader.current;
      fileReader.current = null;
      reader?.abort();
    };
  }, [api]);
  const hasPreview =
    /<(?:img|table)\b/i.test(html) ||
    Boolean(
      html
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;|&#160;/g, "")
        .trim(),
    );
  function readFile(file?: File) {
    if (!file || locked || fileReader.current) return;
    setFileError(undefined);
    if (file.size > 12_000_000) {
      setFileError("Choose a file smaller than 12 MB.");
      return;
    }
    const image = allowedImages.has(file.type);
    if (!image && !/\.html?$/i.test(file.name)) {
      setFileError("Choose a PNG, JPG, GIF, WEBP or HTML signature file.");
      return;
    }
    const reader = new FileReader();
    fileReader.current = reader;
    setReading(true);
    reader.onload = () => {
      if (fileReader.current !== reader) return;
      setHtml(
        image
          ? `<img src="${String(reader.result)}" alt="Email signature" />`
          : String(reader.result),
      );
      fileReader.current = null;
      setReading(false);
    };
    reader.onerror = () => {
      if (fileReader.current !== reader) return;
      fileReader.current = null;
      setReading(false);
      setFileError("The selected file could not be read.");
    };
    if (image) reader.readAsDataURL(file);
    else reader.readAsText(file);
  }
  return (
    <div className={styles.stack}>
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
          disabled={locked}
          onClick={() => upload.current?.click()}
        >
          Browse file
        </SettingsButton>
        <input
          ref={upload}
          type="file"
          hidden
          disabled={locked}
          accept="image/png,image/jpeg,image/gif,image/webp,.html,.htm"
          onChange={(event) => {
            void readFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      <p className={styles.description}>
        Export your signature from Outlook (File → Options → Mail → Signatures →
        save as HTML) or Gmail (copy source), then upload it here.
      </p>
      <div className={styles.divider}>or compose manually</div>
      <RichSignatureEditor
        value={html}
        onChange={setHtml}
        onImage={() => upload.current?.click()}
        disabled={locked}
      />
      {hasPreview && (
        <iframe
          className={styles.signaturePreview}
          title="Email signature preview"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'"><style>body{font:13px Arial;margin:12px;color:#0a0a0a}</style>${html}`}
        />
      )}
      <div className={styles.check}>
        <SettingsSwitch
          label="Append signature to campaign emails by default"
          checked={enabled}
          disabled={locked}
          onChange={setEnabled}
        />
        <span>
          Append signature to campaign emails by default
          <br />
          <span className={styles.description}>
            You can still toggle it per campaign at send time.
          </span>
        </span>
      </div>
      {(fileError || action.error) && (
        <SettingsNotice title="Signature could not be saved" error>
          {fileError ?? action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      {reading && <p role="status">Reading the selected signature file…</p>}
      <SettingsMutationNotice {...mutation} busy={action.busy} />
      <div className={styles.footer}>
        <SettingsButton
          disabled={locked}
          onClick={() => {
            setHtml(initialHtml ?? "");
            setEnabled(initialEnabled);
            action.clear();
          }}
        >
          Cancel
        </SettingsButton>
        <SettingsButton
          primary
          disabled={locked || html.length > signatureLimit}
          onClick={() =>
            void action.run(
              (signal) =>
                api.request(
                  "me.emailSignature.update",
                  {
                    body: { html, enabled },
                  },
                  { signal },
                ),
              "Your signature was saved.",
              reload,
            )
          }
        >
          {action.busy ? "Saving…" : "Save signature"}
        </SettingsButton>
      </div>
    </div>
  );
}

export function EmailSignature() {
  const query = useCapiroQuery("me.emailSignature.read", {});
  return (
    <SettingsCard
      title="Email signature"
      action={<SettingsNewBadge />}
      description="Appended to campaign emails. Type it, paste from Outlook or Gmail, upload an image of your signature, or upload an HTML file. Toggle it per campaign when you send."
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <SignatureEditor
            key={`${query.data.html}:${query.data.enabled}`}
            initialHtml={query.data.html}
            initialEnabled={query.data.enabled}
            reload={query.reload}
          />
        )}
      </StatusPanel>
    </SettingsCard>
  );
}
