"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  assertClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import {
  prepareProspectUpload,
  uploadProspectFile,
  type ProspectUpload,
} from "./prospect-upload";

export function useProspectUpload(
  prospectId: string,
  actor: ClientWriter,
  onSaved: () => void,
) {
  const cache = useQueryClient();
  const api = useApi();
  const key = ["prospect-upload", actor.tenantId, actor.userId, prospectId];
  const entry = useQuery<ProspectUpload | null>({
    queryKey: key,
    enabled: false,
    queryFn: async () => null,
    initialData: null,
    gcTime: Infinity,
  });
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  async function run(file?: File) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const guard = () => {
      controller.signal.throwIfAborted();
      assertClientWriter(cache, actor);
    };
    setBusy(true);
    setError(null);
    try {
      const existing = cache.getQueryData<ProspectUpload | null>(key);
      if (!existing && !file)
        throw new Error("Choose a file before uploading.");
      const attempt =
        existing ??
        (await prepareProspectUpload(
          prospectId,
          actor,
          file!,
          crypto.randomUUID(),
          guard,
        ));
      guard();
      cache.setQueryData(key, attempt);
      const result = await uploadProspectFile(
        api,
        attempt,
        controller.signal,
        guard,
        (value) => {
          if (alive.current) setStage(value);
        },
      );
      guard();
      cache.setQueryData(key, null);
      setStage(
        `${result.fileName} uploaded. Readiness is checked in Files before preview or download.`,
      );
      onSaved();
    } catch (cause) {
      if (alive.current && !controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause
            : new Error("The original upload could not be confirmed."),
        );
    } finally {
      if (request.current === controller) request.current = null;
      if (alive.current) setBusy(false);
    }
  }
  return { attempt: entry.data, run, busy, stage, error };
}
