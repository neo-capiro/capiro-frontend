"use client";
import { useEffect, useSyncExternalStore } from "react";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import {
  MAX_COMPOSER_UPLOADS,
  resolveRecoveredAttempts,
} from "../../../shared/meri-uploads/upload-controller";
import type { ComposerAttachments } from "./attachment-slot";

export { MAX_COMPOSER_UPLOADS };

const noSubscription = () => () => undefined;
const noVersion = () => 0;

/**
 * The slot the composer presents for one displayed conversation port. The unavailable copy travels
 * only while no port has bound an upload access: a bound access is the Attach control itself, so
 * its tooltip must never repeat "Not available yet" beside a working file input.
 */
export function composerAttachmentSlot(
  port: MeriConversationPort | null,
  unavailable: string,
): ComposerAttachments {
  const uploads = port?.uploads ?? null;
  return {
    ...(port
      ? { selectedTab: { access: port.selectedTab, context: port.context } }
      : {}),
    available: uploads !== null,
    ...(uploads === null ? { unavailable } : {}),
    items: uploads?.items() ?? [],
    incoming: uploads?.incoming() ?? [],
    busy: uploads?.pending() ?? false,
    checking: uploads?.checking() ?? false,
    overdue: (requestId) => uploads?.overdue(requestId) ?? false,
    sendArgument: uploads?.sendArgument() ?? [],
    onPick: (files) => void uploads?.add(files),
    onCheck: (requestId) => void uploads?.check(requestId),
    onRemove: (requestId) => void uploads?.remove(requestId),
    onCancel: (requestId) => uploads?.cancel(requestId),
    onDismiss: (requestId) => uploads?.dismiss(requestId),
    onToggleIncoming: (uploadId) => uploads?.toggle(uploadId),
    limit: MAX_COMPOSER_UPLOADS,
  };
}

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
  // A recovered attempt is only a reference: a reconnect replaces the conversation port and its
  // uploads, so the row that was just uploaded comes back as an identity-less "awaiting status".
  // Reading custody once when the access appears resolves it to the file the service already stores,
  // exactly as a failed-send row is resolved when it is offered back to the composer.
  useEffect(() => {
    if (uploads) resolveRecoveredAttempts(uploads);
  }, [uploads]);
  return composerAttachmentSlot(port, unavailable);
}
