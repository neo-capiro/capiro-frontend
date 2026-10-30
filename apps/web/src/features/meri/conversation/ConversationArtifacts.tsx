"use client";
import { useEffect, useRef, useState } from "react";
import {
  Artifact,
  ArtifactActions,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@capiro/ui/artifact";
import { Button } from "@capiro/ui/button";
import { FileText } from "lucide-react";
import type {
  ArtifactAccess,
  ArtifactPreview,
  ArtifactReply,
} from "../../../shared/meri-documents/artifact-access";
import { unavailableResources } from "../../../shared/meri-resources/unavailable";
import { DocumentInspectionSummary } from "../files/DocumentInspectionSummary";
import { DocumentSourcePanel } from "../files/DocumentSourcePanel";
import { DocumentDownloadUrl } from "../files/download-url";
import { StatusPill } from "../ui/StatusPill";
import type { ConversationFile as Listed } from "./intents/prepared-files";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";

type Status =
  | { kind: "idle" }
  | { kind: "working"; action: "preview" | "download" }
  | { kind: "failed"; action: "preview" | "download"; code: string }
  | { kind: "downloaded"; filename: string };
const sizes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Published files and prepared drafts; every read goes through the current artifact owner. */
export function ConversationArtifacts({
  artifacts,
  access,
}: {
  artifacts: readonly Listed[];
  access: ArtifactAccess;
}) {
  // Nothing published or prepared: the conversation stays quiet; Library is the file entry point.
  if (artifacts.length === 0) return null;
  return (
    <section className={styles.files} aria-labelledby="conversation-files">
      <h2 id="conversation-files">Files in this conversation</h2>
      <ul className={styles.fileList}>
        {artifacts.map((artifact) => (
          <li key={artifact.versionId}>
            <ConversationArtifact artifact={artifact} access={access} />
          </li>
        ))}
      </ul>
      <p className={styles.muted}>
        {unavailableResources.workspaceFiles.summary}
      </p>
    </section>
  );
}

/** Preview and download for one listed version; the newest command supersedes an older one. */
function useArtifactActions(access: ArtifactAccess, versionId: string) {
  const [preview, setPreview] = useState<ArtifactPreview | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const work = useRef<AbortController | null>(null);
  const [url] = useState(() => new DocumentDownloadUrl());
  useEffect(
    () => () => {
      work.current?.abort();
      url.clear();
    },
    [url],
  );
  const begin = (action: "preview" | "download") => {
    work.current?.abort();
    const controller = new AbortController();
    work.current = controller;
    setStatus({ kind: "working", action });
    return controller;
  };
  const refuse = (
    action: "preview" | "download",
    reply: Extract<ArtifactReply<unknown>, { ok: false }>,
  ) => {
    if (reply.accessDenied) {
      setPreview(null);
      url.clear();
    }
    setStatus({ kind: "failed", action, code: reply.code });
  };
  const inspect = async () => {
    const controller = begin("preview");
    const reply = await access.inspect(versionId, controller.signal);
    if (work.current !== controller) return;
    if (!reply.ok) return refuse("preview", reply);
    setPreview(reply.value);
    setStatus({ kind: "idle" });
  };
  const download = async () => {
    const controller = begin("download");
    const reply = await access.download(versionId, controller.signal);
    if (work.current !== controller) return;
    if (!reply.ok) return refuse("download", reply);
    const link = document.createElement("a");
    link.href = url.replace(
      new Blob([reply.value.bytes], { type: reply.value.mimeType }),
    );
    link.download = reply.value.filename;
    link.rel = "noopener";
    link.click();
    setStatus({ kind: "downloaded", filename: reply.value.filename });
  };
  return { preview, status, inspect, download };
}

const outcome = (status: Status) =>
  status.kind === "failed"
    ? `${status.action === "preview" ? "Preview" : "Download"} unavailable (${status.code}). Nothing was substituted.`
    : status.kind === "downloaded"
      ? `Downloaded ${status.filename}; its bytes matched the inspected version.`
      : "";

function ConversationArtifact({
  artifact,
  access,
}: {
  artifact: Listed;
  access: ArtifactAccess;
}) {
  const { preview, status, inspect, download } = useArtifactActions(
    access,
    artifact.versionId,
  );
  const name =
    preview?.filename ?? `File version ${artifact.versionId.slice(0, 8)}`;
  const working = (action: "preview" | "download") =>
    status.kind === "working" && status.action === action;
  return (
    <Artifact className={styles.file} role="group" aria-label={name}>
      <ArtifactHeader className={styles.fileHeader}>
        <FileText aria-hidden />
        <div>
          <ArtifactTitle>{name}</ArtifactTitle>
          <ArtifactDescription className={styles.muted}>
            {preview
              ? `${preview.mimeType} · ${sizes(preview.bytes)}`
              : "Preview to load its details from the service."}
          </ArtifactDescription>
        </div>
      </ArtifactHeader>
      {artifact.prepared && (
        <p className={styles.muted}>Prepared draft · Not filed or shared</p>
      )}
      <ArtifactActions className={styles.fileActions}>
        <Button
          type="button"
          variant="outline"
          className={ui.outline}
          disabled={status.kind === "working"}
          onClick={() => void inspect()}
        >
          {working("preview") ? "Loading preview…" : "Preview"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={ui.outline}
          disabled={status.kind === "working"}
          onClick={() => void download()}
        >
          {working("download") ? "Preparing download…" : "Download"}
        </Button>
      </ArtifactActions>
      <div role="status" className={styles.muted}>
        {outcome(status)}
      </div>
      {preview && (
        <div className={styles.preview}>
          {preview.kind === "native-file" ? (
            <>
              <p>{preview.path}</p>
              <StatusPill>Stored bytes verified</StatusPill>
              <DocumentSourcePanel access={access} preview={preview} />
            </>
          ) : (
            <>
              <div className={styles.pills}>
                <StatusPill>{`Generation: ${preview.generationStatus}`}</StatusPill>
                <StatusPill>{`Preview: ${preview.previewStatus}`}</StatusPill>
              </div>
              <DocumentInspectionSummary inspection={preview.inspection} />
            </>
          )}
        </div>
      )}
    </Artifact>
  );
}
