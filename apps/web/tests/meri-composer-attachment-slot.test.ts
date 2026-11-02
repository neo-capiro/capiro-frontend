import { expect, it } from "vitest";
import { composerAttachmentSlot } from "../src/features/meri/uploads/useComposerAttachments";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";

/**
 * The 2 Nov acceptance: in a conversation whose port had bound an upload access (the file input
 * worked), the Attach control still read "Not available yet: Attaching files to a message is not
 * available yet…". The composer showed the unavailable copy as the picker's tooltip because the slot
 * carried it unconditionally. The copy belongs only to a slot with no bound access.
 */
const unavailable =
  "Not available yet: Attaching files to a message is not available yet.";

function portWithUploads(): MeriConversationPort {
  const uploads = {
    items: () => [],
    incoming: () => [],
    pending: () => false,
    checking: () => true,
    overdue: (requestId: string) => requestId === "late",
    sendArgument: () => [],
    version: () => 1,
    subscribe: () => () => undefined,
    add: async () => undefined,
    check: async () => undefined,
    remove: async () => undefined,
    cancel: () => undefined,
    dismiss: () => undefined,
    toggle: () => undefined,
  };
  return {
    uploads,
    selectedTab: {},
    context: {
      tenantId: "tenant",
      actorId: "actor",
      conversationId: "00000000-0000-4000-8000-000000000001",
      selectedClientId: null,
    },
  } as unknown as MeriConversationPort;
}

it("carries the unavailable copy only while no conversation port has bound an upload access", () => {
  const absent = composerAttachmentSlot(null, unavailable);
  expect(absent.available).toBe(false);
  expect(absent.unavailable).toBe(unavailable);
  expect(absent.items).toEqual([]);
  expect(absent.busy).toBe(false);
  expect(absent.checking).toBe(false);
  expect(absent.overdue("late")).toBe(false);

  const bound = composerAttachmentSlot(portWithUploads(), unavailable);
  expect(bound.available).toBe(true);
  expect("unavailable" in bound).toBe(false);
  expect(bound.checking).toBe(true);
  expect(bound.overdue("late")).toBe(true);
  expect(bound.overdue("other")).toBe(false);
  expect(bound.selectedTab?.context.conversationId).toBe(
    "00000000-0000-4000-8000-000000000001",
  );
});
