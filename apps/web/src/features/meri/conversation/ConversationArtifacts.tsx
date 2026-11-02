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
import { OfficeWorkspaceLink } from "../office/OfficeWorkspaceLink";
import { StatusPill } from "../ui/StatusPill";
import {
  artifactCardSummary,
  officeTargetFor,
  type ArtifactCardScope,
} from "./artifact-card";
import type { ConversationFile as Listed } from "./intents/prepared-files";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";

type Status =
  | { kind: "idle" }
  | { kind: "working"; action: "preview" | "download" }
  | { kind: "failed"; action: "preview" | "download"; code: string }
  | { kind: "downloaded"; filename: string };

/** Published files and prepared drafts; every read goes through the current artifact owner. */
export function ConversationArtifacts({
  artifacts,
  access,
  scope,
}: {
  artifacts: readonly Listed[];
  access: ArtifactAccess;
  /** The conversation the files belong to; a General conversation has no client. */
  scope: ArtifactCardScope;
}) {
  // Nothing published or prepared: the conversation stays quiet; Library is the file entry point.
  if (artifacts.length === 0) return null;
  return (
    <section className={styles.files} aria-labelledby="conversation-files">
      <h2 id="conversation-files">Files in this conversation</h2>
      <ul className={styles.fileList}>
        {artifacts.map((artifact) => (
          <li key={artifact.versionId}>
            <ConversationArtifact
              artifact={artifact}
              access={access}
              scope={scope}
            />
          </li>
        ))}
      </ul>
      <p className={styles.muted}>
        {unavailableResources.workspaceFiles.summary}
      </p>
    </section>
  );
}

/**
 * Details and download for one listed version; the newest command supersedes an older one. The details
 * are read once when the card mounts, so the card names the file, its kind, size and version without a
 * click; a read the owner refuses leaves the card with its version identity and the person's retry.
 */
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
  // The details are read once for the version, when the card mounts with nothing read and nothing refused; a
  // renewed access owner never re-reads a card already showing its details (no blink), and after a refusal or
  // a denial only the person's "Read details again" asks once more.
  useEffect(() => {
    if (preview !== null || status.kind !== "idle") return;
    const controller = new AbortController();
    work.current?.abort();
    work.current = controller;
    void access.inspect(versionId, controller.signal).then((reply) => {
      if (work.current !== controller) return;
      if (reply.ok) {
        setPreview(reply.value);
        setStatus({ kind: "idle" });
        return;
      }
      if (reply.accessDenied) url.clear();
      setStatus({ kind: "failed", action: "preview", code: reply.code });
    });
    return () => {
      if (work.current === controller) work.current = null;
      controller.abort();
    };
  }, [access, versionId, preview, status.kind, url]);
  return { preview, status, inspect, download };
}

const outcome = (status: Status) =>
  status.kind === "failed"
    ? `${status.action === "preview" ? "File details" : "Download"} unavailable (${status.code}). Nothing was substituted.`
    : status.kind === "downloaded"
      ? `Downloaded ${status.filename}; its bytes matched the inspected version.`
      : "";

function ConversationArtifact({
  artifact,
  access,
  scope,
}: {
  artifact: Listed;
  access: ArtifactAccess;
  scope: ArtifactCardScope;
}) {
  const { preview, status, inspect, download } = useArtifactActions(
    access,
    artifact.versionId,
  );
  const [details, setDetails] = useState(false);
  const { title, description } = artifactCardSummary(preview);
  const office = officeTargetFor(scope, artifact.versionId, preview);
  const working = (action: "preview" | "download") =>
    status.kind === "working" && status.action === action;
  const failedRead = status.kind === "failed" && status.action === "preview";
  return (
    <Artifact className={styles.file} role="group" aria-label={title}>
      <ArtifactHeader className={styles.fileHeader}>
        <FileText aria-hidden />
        <div>
          <ArtifactTitle>{title}</ArtifactTitle>
          <ArtifactDescription className={styles.muted}>
            {working("preview") ? "Reading the file details…" : description}
          </ArtifactDescription>
        </div>
      </ArtifactHeader>
      {artifact.prepared && (
        <p className={styles.muted}>
          Prepared draft · Saved under Files
          {scope.clientId ? "" : " (My files)"}; not filed to a client
        </p>
      )}
      <ArtifactActions className={styles.fileActions}>
        <Button
          type="button"
          variant="outline"
          className={ui.outline}
          disabled={status.kind === "working"}
          onClick={() => void download()}
        >
          {working("download") ? "Preparing download…" : "Download"}
        </Button>
        {office && <OfficeWorkspaceLink version={office} />}
        {preview ? (
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={status.kind === "working"}
            onClick={() => setDetails((open) => !open)}
          >
            {details ? "Hide details" : "Details"}
          </Button>
        ) : (
          failedRead && (
            <Button
              type="button"
              variant="outline"
              className={ui.outline}
              onClick={() => void inspect()}
            >
              Read details again
            </Button>
          )
        )}
      </ArtifactActions>
      <div role="status" className={styles.muted}>
        {outcome(status)}
      </div>
      {preview && details && (
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
