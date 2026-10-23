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

const entryIdentity = {
  version: z.literal("meri.entry.v1"),
  entryId: z.uuid(),
  clientId: z.uuid(),
  requestId: z.uuid(),
  createdAtMs: z.number().int().safe().nonnegative(),
  expiresAtMs: z.number().int().safe().positive(),
};
const clientTarget = z.strictObject({
  source: z.enum(["client-profile", "command-palette"]),
});
export const meriEntityTarget = z.discriminatedUnion("source", [
  z.strictObject({ source: z.literal("workspace-draft"), draftId: z.uuid() }),
  z.strictObject({ source: z.literal("planner-task"), taskId: z.uuid() }),
]);
export type MeriEntityTarget = z.infer<typeof meriEntityTarget>;

/** Local reference only. The source owner resolves these IDs under current access. */
export const meriEntry = z.discriminatedUnion("source", [
  clientTarget.extend(entryIdentity),
  ...meriEntityTarget.options.map((target) => target.extend(entryIdentity)),
]);
export type MeriEntry = z.infer<typeof meriEntry>;
export type EntryScope = {
  tenantId: string;
  actorId: string;
  clientId: string;
};
type EntryTarget = z.infer<typeof clientTarget> | MeriEntityTarget;
const targetSchema = z.union([clientTarget, meriEntityTarget]);
function record(
  scope: Pick<EntryScope, "tenantId" | "actorId">,
  storage: TabStorage,
) {
  return tabRecord(
    { ...scope, clientId: null, conversationId: "entry" },
    "entry",
    (value) => meriEntry.parse(value),
    "",
    storage,
  );
}
export function prepareClientEntry(
  scope: EntryScope,
  storage = requireMeriTabStorage(),
  now = Date.now(),
  issueId = () => crypto.randomUUID(),
  source: z.infer<typeof clientTarget>["source"] = "client-profile",
) {
  return prepareEntry(scope, { source }, storage, now, issueId);
}
export function prepareEntityEntry(
  scope: EntryScope,
  target: MeriEntityTarget,
  storage = requireMeriTabStorage(),
  now = Date.now(),
  issueId = () => crypto.randomUUID(),
) {
  return prepareEntry(
    scope,
    meriEntityTarget.parse(target),
    storage,
    now,
    issueId,
  );
}
function prepareEntry(
  scope: EntryScope,
  target: EntryTarget,
  storage: TabStorage | undefined,
  now: number,
  issueId: () => string,
) {
  if (!storage)
    throw new Error("The current tab cannot retain the client handoff.");
  const checkedTarget = targetSchema.parse(target);
  const owner = record(scope, storage);
  const previous = owner.read();
  const current = readFirstChatIntent(scope, storage);
  const sameTarget =
    previous &&
    (checkedTarget.source === "workspace-draft"
      ? previous.source === "workspace-draft" &&
        previous.draftId === checkedTarget.draftId
      : checkedTarget.source === "planner-task"
        ? previous.source === "planner-task" &&
          previous.taskId === checkedTarget.taskId
        : previous.source === "client-profile" ||
          previous.source === "command-palette");
  // An existing entry remains the same navigation intent on a double click/retry.
  if (
    previous &&
    previous.clientId === scope.clientId &&
    sameTarget &&
    previous.expiresAtMs > now &&
    current?.requestId === previous.requestId
  )
    return previous;
  // A different local reference retires the old link, not an unresolved Core request.
  // The conversation remains bound to the same client; nothing is submitted here.
  const intent =
    current?.state === "pending"
      ? current
      : beginNewChatIntent(scope, storage, issueId);
  const entry = meriEntry.parse({
    ...checkedTarget,
    version: "meri.entry.v1",
    entryId: issueId(),
    clientId: scope.clientId,
    requestId: intent.requestId,
    createdAtMs: now,
    expiresAtMs: now + 300_000,
  });
  owner.write(entry);
  return entry;
}
export function readClientEntry(
  scope: EntryScope,
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
/** Rejected source access retires the local reference, preserving uncertain bootstrap identity. */
export function retireEntry(
  scope: EntryScope,
  entryId: string,
  storage = requireMeriTabStorage(),
) {
  if (!storage) throw new Error("Client handoff unavailable");
  const owner = record(scope, storage);
  if (owner.read()?.entryId === entryId) owner.clear();
}
/** One local reference per account. A confirmed scope change retires its old link. */
export function retireEntryForScope(
  account: Pick<EntryScope, "tenantId" | "actorId">,
  clientId: string | null,
  storage = requireMeriTabStorage(),
) {
  if (!storage) return;
  const owner = record(account, storage);
  const entry = owner.read();
  if (entry && entry.clientId !== clientId) owner.clear();
}
export function clientEntryHref(entry: MeriEntry) {
  const checked = meriEntry.parse(entry);
  return `/meri?${new URLSearchParams({ clientId: checked.clientId, entry: checked.entryId })}`;
}
