import {
  memoryDraftRequestBytes,
  memoryDraftSubmissionBytes,
  parseMemoryDraftSave,
  parseMemoryDraftSubmit,
  parseMemoryDraftReceipt,
  parseMemoryDraftSubmissionReceipt,
} from "@capiro/shared/settings-memory-drafts";
import type { CapiroApi } from "../../../../shared/capiro/http";
import type { capiroOperations } from "../../../../shared/capiro/registry";
import type { SettingsWrite } from "../../security-write-types";
import { settingsBytesHash } from "../../security-write-journal";
type Api = CapiroApi<typeof capiroOperations>;
export const isMemoryDraftWrite = (operation: string) =>
  operation === "settings.memory.drafts.save" ||
  operation === "settings.memory.drafts.submit";

/** Metadata binds the exact request to Core's canonical file scope and current account. */
export async function prepareMemoryDraftWrite(
  api: Api,
  write: SettingsWrite,
  signal?: AbortSignal,
) {
  if (!isMemoryDraftWrite(write.operation)) return;
  const { params = {} } = write.input;
  if (
    !write.expectedAccount ||
    typeof params.type !== "string" ||
    typeof params.slug !== "string" ||
    typeof params.id !== "string"
  )
    throw Error("The memory draft target could not be verified.");
  const file = await api.request(
    "settings.memory.drafts.file",
    { params: { type: params.type, slug: params.slug } },
    { signal },
  );
  if (file.type !== params.type || file.slug !== params.slug)
    throw Error("The memory file changed. Reload before continuing.");
  const target = {
    type: file.type,
    slug: file.scope === "user" ? write.expectedAccount.userId : file.slug,
    scope: file.scope,
    clientId: file.scope === "client" ? file.slug : null,
  };
  const bytes =
    write.operation === "settings.memory.drafts.save"
      ? memoryDraftRequestBytes(
          target,
          params.id,
          parseMemoryDraftSave(write.input.body),
        )
      : memoryDraftSubmissionBytes(
          target,
          params.id,
          parseMemoryDraftSubmit(write.input.body),
        );
  write.domainRequestHash = await settingsBytesHash(bytes);
}
/** Receipts describe the original operation, never the current publication state. */
export function memoryDraftReceiptMatches(
  write: SettingsWrite,
  raw: unknown,
): boolean {
  try {
    const { params = {}, body = {} } = write.input;
    if (!write.domainRequestHash || !write.expectedAccount) return false;
    if (write.operation === "settings.memory.drafts.save") {
      const receipt = parseMemoryDraftReceipt(raw);
      return (
        receipt.draftId === params.id &&
        receipt.requestId === body.requestId &&
        receipt.requestHash === write.domainRequestHash &&
        receipt.revision === Number(body.expectedRevision) + 1 &&
        receipt.state ===
          (body.action === "save"
            ? "draft"
            : body.action === "discard"
              ? "discarded"
              : null)
      );
    }
    if (write.operation === "settings.memory.drafts.submit") {
      const receipt = parseMemoryDraftSubmissionReceipt(raw);
      return (
        receipt.draftId === params.id &&
        receipt.requestId === body.requestId &&
        receipt.requestHash === write.domainRequestHash &&
        receipt.draftRevision === body.expectedRevision
      );
    }
    return false;
  } catch {
    return false;
  }
}
export async function reconcileMemoryDraft(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
) {
  const { params = {}, body = {} } = write.input;
  if (
    !write.domainRequestHash ||
    !write.expectedAccount ||
    typeof params.type !== "string" ||
    typeof params.slug !== "string" ||
    typeof params.id !== "string" ||
    typeof body.requestId !== "string"
  )
    return false;
  const account = await api.request("me.read", {}, { signal });
  if (
    account.user.id !== write.expectedAccount.userId ||
    account.tenant.id !== write.expectedAccount.tenantId
  )
    return false;
  const receipt = await api.request(
    write.operation === "settings.memory.drafts.submit"
      ? "settings.memory.drafts.submissionReceipt"
      : "settings.memory.drafts.receipt",
    {
      params: {
        type: params.type,
        slug: params.slug,
        id: params.id,
        requestId: body.requestId,
      },
    },
    { signal },
  );
  signal.throwIfAborted();
  return memoryDraftReceiptMatches(write, receipt);
}
