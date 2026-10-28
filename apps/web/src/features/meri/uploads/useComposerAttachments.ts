"use client";
import { useMemo, useRef, useSyncExternalStore } from "react";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { createUploadController } from "../../../shared/meri-uploads/upload-controller";
import type { UploadWire } from "../../../shared/meri-uploads/upload-wire";
import type { ComposerAttachments } from "./attachment-slot";

/**
 * The conversation session owns the credential and publishes a bound upload wire through its port.
 * Until that one line exists, attachments stay unavailable rather than borrowing a credential here.
 */
type UploadBearingPort = MeriConversationPort & {
  readonly uploads?: UploadWire;
};

/** The canonical conversation input carries 1..8 ordered distinct upload ids. */
export const MAX_COMPOSER_UPLOADS = 8;

const noSubscription = () => () => undefined;
const noVersion = () => 0;

export function useComposerAttachments(
  port: MeriConversationPort | null,
  unavailable: string,
): ComposerAttachments {
  const wire = (port as UploadBearingPort | null)?.uploads ?? null;
  const scope = port
    ? JSON.stringify([
        port.context.tenantId,
        port.context.actorId,
        port.context.selectedClientId,
        port.context.conversationId,
      ])
    : null;
  // Latest displayed scope: a controller stops publishing the moment its conversation is replaced.
  const displayed = useRef<string | null>(scope);
  displayed.current = scope;
  const controller = useMemo(
    () =>
      wire
        ? createUploadController({
            wire,
            isCurrent: () => displayed.current === scope,
          })
        : null,
    [wire, scope],
  );
  useSyncExternalStore(
    controller?.subscribe ?? noSubscription,
    controller?.version ?? noVersion,
    controller?.version ?? noVersion,
  );
  const items = controller?.items() ?? [];
  return {
    available: controller !== null,
    unavailable,
    items,
    busy: controller?.pending() ?? false,
    sendArgument: controller?.sendArgument() ?? [],
    onPick: (files) => {
      const room = MAX_COMPOSER_UPLOADS - items.length;
      if (room < 1 || !controller) return;
      void controller.add(files.slice(0, room));
    },
    onCheck: (requestId) => void controller?.check(requestId),
    onRemove: (requestId) => void controller?.remove(requestId),
    limit: MAX_COMPOSER_UPLOADS,
  };
}
