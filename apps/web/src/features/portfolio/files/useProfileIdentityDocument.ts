"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  assertClientWriter,
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { uploadParentFile, type UploadAttempt } from "./upload";
import {
  identityDocumentReady,
  readProfileIdentityDocument,
  type IdentityDocumentScope,
} from "./profile-identity-document";
type Receipt = Awaited<ReturnType<typeof readProfileIdentityDocument>>;
type Attempt = {
  upload: UploadAttempt;
  actor: ClientWriter;
  receiptId?: string;
};

/** Retains the existing byte/confirmation attempt for each selected file in this mounted intake. */
export function useProfileIdentityDocument({
  file,
  active,
  capture,
}: {
  file?: File;
  active: boolean;
  capture: () => IdentityDocumentScope;
}) {
  const api = useApi();
  const cache = useQueryClient();
  const attempts = useRef(new WeakMap<File, Attempt>());
  const inFlight = useRef<
    { file: File; promise: Promise<Receipt> } | undefined
  >(undefined);
  const [uploaded, setUploaded] = useState<{ file: File; id: string }>();
  const [progress, setProgress] = useState<{ file: File; text: string }>();
  const actor = currentClientWriter(cache);
  const id = uploaded && uploaded.file === file ? uploaded.id : undefined;
  const query = useQuery({
    queryKey: ["profile-identity-document", actor?.tenantId, actor?.userId, id],
    enabled: active && Boolean(actor && id),
    retry: false,
    queryFn: ({ signal }) => {
      const scope = capture();
      return readProfileIdentityDocument(api, id!, actor!, {
        assert: scope.assert,
        signal: AbortSignal.any([scope.signal, signal]),
      });
    },
    refetchInterval: (state) =>
      state.state.error ||
      (state.state.data &&
        (identityDocumentReady(state.state.data) ||
          [
            "blocked",
            "rejected",
            "deleted",
            "delete_pending",
            "delete_failed",
          ].includes(state.state.data.lifecycleStatus)))
        ? false
        : 2000,
  });
  const mutation = useMutation({
    retry: false,
    mutationFn: async (selected: File): Promise<Receipt> => {
      if (!active)
        throw new Error("Open a current profile session before uploading.");
      const scope = capture();
      let attempt = attempts.current.get(selected);
      if (!attempt) {
        const owner = currentClientWriter(cache);
        if (!owner) throw new Error("A current uploader session is required.");
        attempt = { upload: { actor: owner }, actor: owner };
        attempts.current.set(selected, attempt);
      }
      const { actor: owner } = attempt;
      const guard = () => {
        scope.signal.throwIfAborted();
        scope.assert();
        assertClientWriter(cache, owner);
      };
      guard();
      if (!attempt.receiptId) {
        const receipt = await uploadParentFile(
          api,
          {},
          selected,
          attempt.upload,
          (text) => {
            guard();
            setProgress({ file: selected, text });
          },
          "profile_identity",
          fetch,
          guard,
          scope.signal,
        );
        guard();
        attempt.receiptId = receipt.id;
      }
      setUploaded({ file: selected, id: attempt.receiptId });
      const current = await readProfileIdentityDocument(
        api,
        attempt.receiptId,
        owner,
        scope,
      );
      guard();
      cache.setQueryData(
        ["profile-identity-document", owner.tenantId, owner.userId, current.id],
        current,
      );
      if (!identityDocumentReady(current))
        throw new Error(
          current.blockedReason ??
            "The document is uploaded. Wait for its safety checks before matching a company.",
        );
      return current;
    },
  });
  const denied =
    mutation.error instanceof ApiError &&
    [401, 403, 404].includes(mutation.error.status);
  const attachment =
    active && !denied && query.isSuccess && !query.error
      ? query.data
      : undefined;
  const ensureReady = () => {
    if (!file)
      return Promise.reject(new Error("Choose a supporting document."));
    if (inFlight.current)
      return inFlight.current.file === file
        ? inFlight.current.promise
        : Promise.reject(
            new Error("Wait for the selected document upload to finish."),
          );
    const promise = mutation.mutateAsync(file).finally(() => {
      if (inFlight.current?.promise === promise) inFlight.current = undefined;
    });
    inFlight.current = { file, promise };
    return promise;
  };
  return {
    ensureReady,
    attachment,
    ready: Boolean(attachment && identityDocumentReady(attachment)),
    pending: mutation.isPending,
    error:
      mutation.variables === file
        ? (mutation.error ?? query.error)
        : query.error,
    stage: progress && progress.file === file ? progress.text : undefined,
    refresh: () => query.refetch(),
  };
}
