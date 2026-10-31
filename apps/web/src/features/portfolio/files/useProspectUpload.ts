"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertClientWriter } from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  RecoveryStorageError,
} from "@/shared/session/recovery/journal";
import {
  prepareProspectUpload,
  uploadProspectFile,
  type ProspectUpload,
} from "./prospect-upload";
import {
  retainedUpload,
  uploadRecoveryContract,
} from "./prospect-upload-recovery";
import { readProspectFiles } from "./prospect-files";
import { assertFileReader, type FileReader } from "./file-reader";

export function useProspectUpload(
  prospectId: string,
  actor: FileReader,
  onSaved: () => void,
) {
  const cache = useQueryClient();
  const api = useApi();
  const scope = JSON.stringify([
    "prospect-upload",
    actor.tenantId,
    actor.userId,
    prospectId,
  ]);
  const retained = useRetainedIntent(
    scope,
    uploadRecoveryContract,
    async (signal, assert) => {
      const guard = () => {
        assert();
        assertFileReader(cache, actor);
        assertClientWriter(cache, actor);
      };
      await verifyCoreWriter(api, actor, signal, guard);
      await readProspectFiles(api, prospectId, actor, signal, guard);
    },
    String(actor.revision),
  );
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const working = useRef(false);
  const local = useRef<ProspectUpload | null>(null);
  async function run(file?: File) {
    if (working.current || !retained.ready) return;
    working.current = true;
    setBusy(true);
    setError(null);
    let verified = false;
    const guard = () => {
      retained.guard();
      assertFileReader(cache, actor);
      assertClientWriter(cache, actor);
    };
    try {
      await retained.verify();
      verified = true;
      let original = await readRecovery(scope, uploadRecoveryContract, guard);
      if (!original && retained.record) throw new RecoveryStorageError();
      let prepared: ProspectUpload | undefined;
      if ((!original || !original.bytesStarted) && file)
        prepared = await prepareProspectUpload(
          prospectId,
          { tenantId: actor.tenantId, userId: actor.userId },
          file,
          original?.requestId ?? crypto.randomUUID(),
          guard,
        );
      if (!original) {
        if (!prepared) throw new Error("Choose a file before uploading.");
        original = await reserveRecovery(
          scope,
          prepared.requestId,
          retainedUpload(prepared),
          uploadRecoveryContract,
          guard,
        );
        if (original.requestId !== prepared.requestId) {
          retained.install(original);
          throw new Error(
            "Another view retained an original upload. Recover that intent.",
          );
        }
      }
      if (
        original.prospectId !== prospectId ||
        original.actor.tenantId !== actor.tenantId ||
        original.actor.userId !== actor.userId
      )
        throw new RecoveryStorageError();
      if (
        prepared &&
        (JSON.stringify(prepared.metadata) !==
          JSON.stringify(original.metadata) ||
          prepared.checksumSha256 !== original.checksumSha256)
      )
        throw new Error(
          "Reselect the same original file name, type, length and bytes. The original intent is unchanged.",
        );
      const attempt: ProspectUpload = {
        ...original,
        ...(local.current?.requestId === original.requestId
          ? { file: local.current.file, ticket: local.current.ticket }
          : {}),
        ...(prepared ? { file: prepared.file } : {}),
      };
      local.current = attempt;
      retained.install(original);
      const persist = async (value: ProspectUpload) => {
        const record = retainedUpload(value);
        await updateRecovery(
          scope,
          value.requestId,
          record,
          uploadRecoveryContract,
          guard,
        );
        retained.install(record);
      };
      const result = await uploadProspectFile(
        api,
        attempt,
        retained.signal(),
        guard,
        (value) => {
          guard();
          setStage(value);
        },
        fetch,
        persist,
      );
      guard();
      await acknowledgeRecovery(scope, attempt.requestId, guard);
      retained.install(null);
      local.current = null;
      setStage(
        `${result.fileName} uploaded. Readiness is checked in Files before preview or download.`,
      );
      onSaved();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        !verified ||
        cause instanceof RecoveryStorageError ||
        (cause instanceof ApiError && [401, 403].includes(cause.status))
      )
        retained.block(cause);
      setError(
        cause instanceof Error
          ? cause
          : new Error("The original upload could not be confirmed."),
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return {
    attempt: retained.record,
    run,
    busy,
    stage,
    error,
    ready: retained.ready,
    recoveryError: retained.error,
    retry: retained.retry,
  };
}
