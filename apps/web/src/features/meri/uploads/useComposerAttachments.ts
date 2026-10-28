"use client";
import { useSyncExternalStore } from "react";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { MAX_COMPOSER_UPLOADS } from "../../../shared/meri-uploads/upload-controller";
import type { ComposerAttachments } from "./attachment-slot";

export { MAX_COMPOSER_UPLOADS };

const noSubscription = () => () => undefined;
const noVersion = () => 0;

export function useComposerAttachments(
  port: MeriConversationPort | null,
  unavailable: string,
): ComposerAttachments {
  const uploads = port?.uploads ?? null;
  // The access is the port's own member, so presenting it needs no second controller, no credential
  // and no shape assertion; a replaced session disposes it and its version stops moving.
  useSyncExternalStore(
    uploads?.subscribe ?? noSubscription,
    uploads?.version ?? noVersion,
    uploads?.version ?? noVersion,
  );
  return {
    available: uploads !== null,
    unavailable,
    items: uploads?.items() ?? [],
    incoming: uploads?.incoming() ?? [],
    busy: uploads?.pending() ?? false,
    sendArgument: uploads?.sendArgument() ?? [],
    onPick: (files) => void uploads?.add(files),
    onCheck: (requestId) => void uploads?.check(requestId),
    onRemove: (requestId) => void uploads?.remove(requestId),
    onCancel: (requestId) => uploads?.cancel(requestId),
    onToggleIncoming: (uploadId) => uploads?.toggle(uploadId),
    limit: MAX_COMPOSER_UPLOADS,
  };
}
