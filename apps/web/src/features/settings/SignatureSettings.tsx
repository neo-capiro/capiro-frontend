"use client";

import { useRef, useState } from "react";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { StatusPanel } from "../../shared/module-ui";
import {
  SettingsButton,
  SettingsCard,
  SettingsNewBadge,
  SettingsNotice,
  SettingsSwitch,
} from "./components";
import { useSignatureFile } from "./signature/useSignatureFile";
import { SignatureUpload } from "./signature/SignatureUpload";
import { RichSignatureEditor } from "./signature/RichSignatureEditor";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

const signatureLimit = 18_000_000;
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
  const upload = useRef<HTMLInputElement>(null);
  const { reading, fileError, readFile } = useSignatureFile(
    api,
    mutation.locked,
    setHtml,
  );
  const [readerScope, setReaderScope] = useState(api);
  if (readerScope !== api) {
    setReaderScope(api);
    setHtml(initialHtml ?? "");
    setEnabled(initialEnabled);
  }
  const locked = mutation.locked || reading;
  return (
    <div className={styles.stack}>
      <SignatureUpload upload={upload} disabled={locked} readFile={readFile} />
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
      <SignatureOptions
        html={html}
        enabled={enabled}
        disabled={locked}
        onChange={setEnabled}
      />
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

/** Preview and campaign default are presentation of the current local draft. */
function SignatureOptions({
  html,
  enabled,
  disabled,
  onChange,
}: {
  html: string;
  enabled: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const hasPreview =
    /<(?:img|table)\b/i.test(html) ||
    Boolean(
      html
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;|&#160;/g, "")
        .trim(),
    );
  return (
    <>
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
          disabled={disabled}
          onChange={onChange}
        />
        <span>
          Append signature to campaign emails by default
          <br />
          <span className={styles.description}>
            You can still toggle it per campaign at send time.
          </span>
        </span>
      </div>
    </>
  );
}
