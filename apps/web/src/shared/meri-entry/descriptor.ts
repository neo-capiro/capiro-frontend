import { z } from "zod";
import {
  tabRecord,
  requireMeriTabStorage,
  type TabStorage,
} from "../meri-conversations/tab-journal";
import {
  beginNewChatIntent,
  readFirstChatIntent,
} from "../meri-conversations/first-chat-intent";
import { requireFirstChatCapability } from "../capiro/operations/meri-first-chat";

/** Typed navigation intent only: no prompts, credentials, profile blobs or auto-send. */
export const meriEntry = z.strictObject({
  version: z.literal("meri.entry.v1"),
  entryId: z.uuid(),
  source: z.enum(["client-profile", "command-palette"]),
  clientId: z.uuid(),
  requestId: z.uuid(),
  createdAtMs: z.number().int().safe().nonnegative(),
  expiresAtMs: z.number().int().safe().positive(),
});
export type MeriEntry = z.infer<typeof meriEntry>;
type FirstChatScope = { tenantId: string; actorId: string; clientId: string };
function record(scope: FirstChatScope, storage: TabStorage) {
  return tabRecord(
    { ...scope, conversationId: "entry" },
    "entry",
    (value) => meriEntry.parse(value),
    "",
    storage,
  );
}
export function prepareClientEntry(
  scope: FirstChatScope,
  capability: unknown,
  storage = requireMeriTabStorage(),
  now = Date.now(),
  issueId = () => crypto.randomUUID(),
  source: MeriEntry["source"] = "client-profile",
) {
  if (!storage)
    throw new Error("The current tab cannot retain the client handoff.");
  requireFirstChatCapability(capability, scope, now);
  const owner = record(scope, storage);
  const previous = owner.read();
  // An existing entry remains the same navigation intent on a double click/retry.
  if (
    previous &&
    previous.expiresAtMs > now &&
    readFirstChatIntent(scope, storage)?.requestId === previous.requestId
  )
    return previous;
  const intent = beginNewChatIntent(scope, storage, issueId);
  const entry = meriEntry.parse({
    version: "meri.entry.v1",
    entryId: issueId(),
    source,
    clientId: scope.clientId,
    requestId: intent.requestId,
    createdAtMs: now,
    expiresAtMs: now + 300_000,
  });
  owner.write(entry);
  return entry;
}
export function readClientEntry(
  scope: FirstChatScope,
  entryId: string,
  storage = requireMeriTabStorage(),
  now = Date.now(),
) {
  if (!storage) throw new Error("Client handoff unavailable");
  const entry = record(scope, storage).read();
  if (
    !entry ||
    entry.entryId !== entryId ||
    entry.clientId !== scope.clientId ||
    entry.createdAtMs > now ||
    entry.expiresAtMs <= now ||
    entry.expiresAtMs - entry.createdAtMs > 300_000 ||
    readFirstChatIntent(scope, storage)?.requestId !== entry.requestId
  )
    throw new Error("Client handoff unavailable");
  return entry;
}
export function clientEntryHref(entry: MeriEntry) {
  const checked = meriEntry.parse(entry);
  return `/meri?${new URLSearchParams({ clientId: checked.clientId, entry: checked.entryId })}`;
}
