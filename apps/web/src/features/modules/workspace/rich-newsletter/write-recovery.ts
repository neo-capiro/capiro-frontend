import { z } from "zod";
import {
  parseNewsletterWriteReceipt,
  parseNewsletterSaveRefusal,
  type NewsletterWriteBinding,
  type NewsletterWriteReceipt,
  type NewsletterSaveRefusal,
  type NewsletterCampaign,
} from "@capiro/shared/newsletter";
import {
  richNewsletterSaveBody,
  richNewsletterOperations,
} from "@/shared/capiro/operations/rich-newsletter";
import {
  RichNewsletterSaveRefused,
  type createRichNewsletterAdapter,
} from "@/shared/capiro/rich-newsletter";
import {
  readRecovery,
  reserveRecovery,
  updateRecovery,
  acknowledgeRecovery,
  retireRichNewsletterRefusalRecovery,
  withRecoveryCommandLock,
  RecoveryStorageError,
  type RecoveryContract,
} from "@/shared/session/recovery/journal";
import type { RichDraft } from "./draft";

const identitySchema = z
  .object({
    tenantId: z.string().min(1),
    userId: z.string().min(1),
    actorId: z.string().min(1),
    clientId: z.string().nullable(),
  })
  .strict();
export type RichRecoveryIdentity = z.infer<typeof identitySchema>;
export class RichRecoveryScopeError extends Error {
  constructor() {
    super(
      "The newsletter account or client changed. Reopen Workspace to verify current access.",
    );
  }
}
export type RecoveryLifetime = { signal: AbortSignal; assert: () => void };
type Outcome =
  | { kind: "committed"; receipt: NewsletterWriteReceipt }
  | { kind: "refused"; refusal: NewsletterSaveRefusal };
const draftSchema = richNewsletterSaveBody.omit({
  requestId: true,
  revision: true,
});
const common = {
  version: z.literal(1),
  identity: identitySchema,
  draft: draftSchema,
  outcome: z.unknown().optional(),
};
const retainedSchema = z.discriminatedUnion("operation", [
  z
    .object({
      ...common,
      operation: z.literal("create"),
      body: richNewsletterOperations["workspace.richNewsletter.create"].request
        .shape.body,
    })
    .strict(),
  z
    .object({
      ...common,
      operation: z.literal("save"),
      documentId: z.uuid(),
      body: richNewsletterSaveBody,
    })
    .strict(),
]);
type RecordInput = z.infer<typeof retainedSchema>;
export type RichRetainedWrite =
  | (Omit<Extract<RecordInput, { operation: "create" }>, "outcome"> & {
      outcome?: Outcome;
    })
  | (Omit<Extract<RecordInput, { operation: "save" }>, "outcome"> & {
      outcome?: Outcome;
    });

export function writeBinding(record: RecordInput): NewsletterWriteBinding {
  return record.operation === "create"
    ? { requestId: record.body.requestId, operation: "create" }
    : {
        requestId: record.body.requestId,
        operation: "save",
        documentId: record.documentId,
        previousRevision: record.body.revision,
      };
}
function parsedRetained(value: unknown): RichRetainedWrite {
  const record = retainedSchema.parse(value);
  if (record.outcome === undefined) return record as RichRetainedWrite;
  const outcome = z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("committed"), receipt: z.unknown() }).strict(),
      z.object({ kind: z.literal("refused"), refusal: z.unknown() }).strict(),
    ])
    .parse(record.outcome);
  const binding = writeBinding(record);
  if (outcome.kind === "committed") {
    const parsed = parseNewsletterWriteReceipt(outcome.receipt, binding);
    if (parsed.ok)
      return {
        ...record,
        outcome: { kind: "committed", receipt: parsed.value },
      };
  } else if (binding.operation === "save") {
    const parsed = parseNewsletterSaveRefusal(outcome.refusal, binding);
    if (parsed.ok)
      return { ...record, outcome: { kind: "refused", refusal: parsed.value } };
  }
  throw new RecoveryStorageError();
}
const immutable = (record: RichRetainedWrite) =>
  JSON.stringify({ ...record, outcome: undefined });
export const sameRichWrite = (
  left: RichRetainedWrite,
  right: RichRetainedWrite,
) => immutable(left) === immutable(right);
export const richRecoveryContract: RecoveryContract<RichRetainedWrite> = {
  schema: z.unknown().transform(parsedRetained),
  requestId: (record) => record.body.requestId,
  validateUpdate(previous, next) {
    if (
      !sameRichWrite(previous, next) ||
      (previous.outcome &&
        JSON.stringify(previous.outcome) !== JSON.stringify(next.outcome))
    )
      throw new RecoveryStorageError();
  },
};
type Adapter = ReturnType<typeof createRichNewsletterAdapter>;
export type RichWriteCapture =
  | { operation: "create"; draft: RichDraft }
  | {
      operation: "save";
      draft: RichDraft;
      documentId: string;
      revision: number;
    };

/** Domain composition only: the existing encrypted journal and command lock own durability. */
export function createRichWriteRecovery(
  adapter: Adapter,
  authorize: (lifetime: RecoveryLifetime) => Promise<RichRecoveryIdentity>,
) {
  let identity: RichRecoveryIdentity | undefined;
  let key: string | undefined;
  async function verify(lifetime: RecoveryLifetime) {
    lifetime.assert();
    const current = identitySchema.parse(await authorize(lifetime));
    lifetime.assert();
    if (identity && JSON.stringify(identity) !== JSON.stringify(current))
      throw new RichRecoveryScopeError();
    identity = current;
    key = JSON.stringify([
      "rich-newsletter-write",
      current.tenantId,
      current.userId,
      current.actorId,
      current.clientId,
    ]);
  }
  async function read(
    lifetime: RecoveryLifetime,
    expected?: RichRetainedWrite,
  ) {
    const record = await readRecovery(
      key!,
      richRecoveryContract,
      lifetime.assert,
    );
    lifetime.assert();
    if (
      (record &&
        JSON.stringify(record.identity) !== JSON.stringify(identity)) ||
      (expected && (!record || !sameRichWrite(expected, record)))
    )
      throw new RecoveryStorageError();
    return record;
  }
  async function install(
    record: RichRetainedWrite,
    outcome: Outcome,
    lifetime: RecoveryLifetime,
  ) {
    const next = parsedRetained({ ...record, outcome });
    await updateRecovery(
      key!,
      record.body.requestId,
      next,
      richRecoveryContract,
      lifetime.assert,
    );
    lifetime.assert();
    return next;
  }
  async function locked<T>(
    lifetime: RecoveryLifetime,
    action: () => Promise<T>,
  ) {
    await verify(lifetime);
    return withRecoveryCommandLock(key!, lifetime.assert, async () => {
      await verify(lifetime);
      return action();
    });
  }
  return {
    async hydrate(lifetime: RecoveryLifetime) {
      return locked(lifetime, () => read(lifetime));
    },
    async dispatch(
      captured: RichWriteCapture,
      lifetime: RecoveryLifetime,
      reserved: (record: RichRetainedWrite) => void,
    ) {
      return locked(lifetime, async () => {
        const existing = await read(lifetime);
        if (existing) {
          reserved(existing);
          return existing;
        }
        const requestId = crypto.randomUUID();
        const common = {
          version: 1 as const,
          identity: identity!,
          draft: structuredClone(captured.draft),
        };
        const original = parsedRetained(
          captured.operation === "create"
            ? {
                ...common,
                operation: "create",
                body: { requestId, name: captured.draft.name },
              }
            : {
                ...common,
                operation: "save",
                documentId: captured.documentId,
                body: {
                  ...structuredClone(captured.draft),
                  requestId,
                  revision: captured.revision,
                },
              },
        );
        const retained = await reserveRecovery(
          key!,
          requestId,
          original,
          richRecoveryContract,
          lifetime.assert,
        );
        lifetime.assert();
        reserved(retained);
        lifetime.assert();
        if (!sameRichWrite(retained, original))
          throw new RecoveryStorageError();
        // Persistence is verified before the only dispatch. Recovery never calls this branch.
        let receipt: NewsletterWriteReceipt;
        try {
          receipt =
            retained.operation === "create"
              ? await adapter.create(retained.body, lifetime.signal)
              : await adapter.save(
                  retained.documentId,
                  retained.body,
                  lifetime.signal,
                );
        } catch (error) {
          lifetime.assert();
          if (error instanceof RichNewsletterSaveRefused) {
            const outcome = {
              kind: "refused" as const,
              refusal: error.refusal,
            };
            reserved(parsedRetained({ ...retained, outcome }));
            return install(retained, outcome, lifetime);
          }
          throw error;
        }
        lifetime.assert();
        reserved(
          parsedRetained({
            ...retained,
            outcome: { kind: "committed", receipt },
          }),
        );
        return install(retained, { kind: "committed", receipt }, lifetime);
      });
    },
    async reconcile(expected: RichRetainedWrite, lifetime: RecoveryLifetime) {
      return locked(lifetime, async () => {
        let record = (await read(lifetime, expected))!;
        if (!record.outcome && expected.outcome)
          record = await install(record, expected.outcome, lifetime);
        const binding = writeBinding(record);
        const pinned =
          record.outcome?.kind === "committed"
            ? {
                ...binding,
                inputHash: record.outcome.receipt.inputHash,
                contentHash: record.outcome.receipt.contentHash,
              }
            : binding;
        const receipt = await adapter.writeRequest(pinned, lifetime.signal);
        lifetime.assert();
        if (!receipt) return { record, accessible: false };
        if (record.outcome?.kind === "refused")
          throw new RecoveryStorageError();
        return {
          record: await install(
            record,
            { kind: "committed", receipt },
            lifetime,
          ),
          accessible: true,
        };
      });
    },
    async resolve(
      expected: RichRetainedWrite,
      reviewed: NewsletterCampaign,
      lifetime: RecoveryLifetime,
    ) {
      return locked(lifetime, async () => {
        const record = (await read(lifetime, expected))!;
        const documentId =
          record.outcome?.kind === "committed"
            ? record.outcome.receipt.documentId
            : record.operation === "save"
              ? record.documentId
              : undefined;
        if (
          !record.outcome ||
          !documentId ||
          documentId.toLowerCase() !== reviewed.id.toLowerCase()
        )
          throw new RecoveryStorageError();
        const current = await adapter.detail(
          documentId,
          undefined,
          lifetime.signal,
        );
        lifetime.assert();
        if (JSON.stringify(current) !== JSON.stringify(reviewed))
          throw new Error(
            "Saved content changed again. Read and review it before adopting or rebasing.",
          );
        if (record.outcome.kind === "committed")
          await acknowledgeRecovery(
            key!,
            record.body.requestId,
            lifetime.assert,
          );
        else
          await retireRichNewsletterRefusalRecovery(
            key!,
            record.body.requestId,
            richRecoveryContract,
            lifetime.assert,
          );
        lifetime.assert();
        return current;
      });
    },
  };
}
export type RichWriteRecovery = ReturnType<typeof createRichWriteRecovery>;
