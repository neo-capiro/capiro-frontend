import { z } from "zod";
import type { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { outreachTemplateOperations as operations } from "../../../../shared/capiro/operations/outreach-templates";
import { templateBase } from "../../../../shared/capiro/operations/outreach-template-schemas";
import type { RecoveryContract } from "../../../../shared/session/recovery/journal";

export type TemplateActor = {
  tenantId: string;
  userId: string;
  clerkUserId: string;
};
export type TemplateApi = ReturnType<typeof useCapiro>;
const command = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("workspace.template.use"),
    accessClientId: z.uuid().optional(),
    input: operations["workspace.template.use"].request,
  }),
  z.object({
    operation: z.literal("workspace.template.publish"),
    accessClientId: z.uuid().optional(),
    input: operations["workspace.template.publish"].request,
  }),
  z.object({
    operation: z.literal("workspace.template.create"),
    accessClientId: z.uuid().optional(),
    input: operations["workspace.template.create"].request,
  }),
  z.object({
    operation: z.literal("workspace.template.from-campaign"),
    accessClientId: z.uuid().optional(),
    input: operations["workspace.template.from-campaign"].request,
  }),
  z.object({
    operation: z.literal("workspace.template.metadata"),
    accessClientId: z.uuid().optional(),
    input: operations["workspace.template.metadata"].request,
  }),
  z.object({
    operation: z.literal("workspace.template.duplicate"),
    accessClientId: z.uuid().optional(),
    input: operations["workspace.template.duplicate"].request,
  }),
  z.object({
    operation: z.literal("workspace.template.archive"),
    accessClientId: z.uuid().optional(),
    input: operations["workspace.template.archive"].request,
  }),
  z.object({
    operation: z.literal("save-draft"),
    accessClientId: z.uuid().optional(),
    input: z
      .object({
        metadata: operations["workspace.template.metadata"].request,
        draft: operations["workspace.template.draft"].request,
      })
      .strict(),
  }),
]);
export type TemplateCommand = z.infer<typeof command>;
export function resultSchema(value: TemplateCommand) {
  return operations[
    value.operation === "save-draft"
      ? "workspace.template.draft"
      : value.operation
  ].response;
}
function boundResult(c: TemplateCommand, raw: unknown) {
  const result = resultSchema(c).parse(raw);
  const input = c.operation === "save-draft" ? c.input.draft : c.input;
  const id = "params" in input ? input.params.templateId : undefined;
  if (
    c.operation === "workspace.template.duplicate" ||
    c.operation === "workspace.template.create" ||
    c.operation === "workspace.template.from-campaign"
  ) {
    const receipt = operations["workspace.template.create"].response.parse(raw);
    return (
      receipt.version.templateId === receipt.template.id &&
      (!id || receipt.template.id !== id)
    );
  }
  if (c.operation === "workspace.template.use") {
    const receipt = operations[c.operation].response.parse(raw);
    return (
      receipt.templateId === id &&
      receipt.receipt.templateId === id &&
      receipt.receipt.templateVersionId === receipt.templateVersionId
    );
  }
  if (c.operation === "workspace.template.publish") {
    const receipt = operations[c.operation].response.parse(raw);
    return (
      receipt.templateId === id &&
      receipt.version.templateId === id &&
      receipt.version.id === c.input.body.expectedDraftVersionId
    );
  }
  return "templateId" in result
    ? result.templateId === id &&
        "version" in result &&
        result.version.templateId === id
    : "id" in result && result.id === id;
}
const schema = z
  .object({
    requestId: z.uuid(),
    command,
    metadataAcknowledged: templateBase.optional(),
    result: z.unknown().optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (
      record.command.operation === "workspace.template.use" &&
      record.command.input.body.requestKey !== record.requestId
    )
      ctx.addIssue({
        code: "custom",
        message: "The retained request key changed.",
      });
    if (
      record.command.operation === "save-draft" &&
      record.command.input.metadata.params.templateId !==
        record.command.input.draft.params.templateId
    )
      ctx.addIssue({
        code: "custom",
        message: "The saved template identity changed.",
      });
    if (
      record.metadataAcknowledged &&
      (record.command.operation !== "save-draft" ||
        record.metadataAcknowledged.id !==
          record.command.input.metadata.params.templateId)
    )
      ctx.addIssue({
        code: "custom",
        message: "The metadata acknowledgment belongs to another command.",
      });
    if (record.result !== undefined) {
      try {
        if (!boundResult(record.command, record.result)) throw new Error();
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "The saved result does not match the original command.",
        });
      }
    }
  });
export type TemplateIntent = z.infer<typeof schema>;
export const templateRecovery: RecoveryContract<TemplateIntent> = {
  schema,
  requestId: (record) => record.requestId,
  validateUpdate(previous, next) {
    if (
      previous.requestId !== next.requestId ||
      JSON.stringify(previous.command) !== JSON.stringify(next.command) ||
      (previous.metadataAcknowledged &&
        JSON.stringify(previous.metadataAcknowledged) !==
          JSON.stringify(next.metadataAcknowledged)) ||
      (previous.result !== undefined &&
        JSON.stringify(previous.result) !== JSON.stringify(next.result))
    )
      throw new Error("The original template command cannot be replaced.");
  },
};
export function templateRecoveryScope(actor: TemplateActor) {
  return JSON.stringify([
    "campaign-template-command",
    actor.tenantId.toLowerCase(),
    actor.userId.toLowerCase(),
    actor.clerkUserId,
  ]);
}
export async function verifyTemplateActor(
  api: TemplateApi,
  actor: TemplateActor,
  signal: AbortSignal,
  guard: () => void,
) {
  const me = await api.request("me.read", {}, { signal });
  guard();
  if (
    me.tenant.id !== actor.tenantId ||
    me.user.id !== actor.userId ||
    me.user.clerkUserId !== actor.clerkUserId ||
    !["standard_user", "user_admin", "capiro_admin"].includes(me.role)
  )
    throw new Error(
      "Sign in with the original account to review this template command.",
    );
}
/** Canonical current reads authorize retained content before it becomes visible. */
export async function readTemplateIntent(
  api: TemplateApi,
  record: TemplateIntent,
  signal: AbortSignal,
  guard: () => void,
) {
  const c = record.command;
  if (c.operation === "workspace.template.use" && record.result !== undefined) {
    const result = operations[c.operation].response.parse(record.result);
    const provenance = await api.request(
      "workspace.template.provenance",
      { params: { sessionId: result.sessionId } },
      { signal },
    );
    guard();
    if (
      !provenance ||
      provenance.sessionId !== result.sessionId ||
      provenance.applicationId !== result.applicationId ||
      provenance.templateVersionId !== result.templateVersionId ||
      provenance.templateId !== c.input.params.templateId
    )
      throw new Error(
        "The original campaign receipt is unavailable under current access.",
      );
    return;
  }
  if (c.operation === "workspace.template.from-campaign") {
    await api.request(
      "workspace.template.provenance",
      { params: { sessionId: c.input.body.sessionId } },
      { signal },
    );
    guard();
  }
  const input = c.operation === "save-draft" ? c.input.metadata : c.input;
  let templateId = "params" in input ? input.params.templateId : undefined;
  // A pending use belongs to its submitted campaign client, even for a private
  // or firm template. Older journal records may retain a different template hint.
  let clientId =
    c.operation === "workspace.template.use"
      ? c.input.body.clientId
      : (record.metadataAcknowledged?.clientId ?? c.accessClientId);
  if (record.metadataAcknowledged?.clientId === null) clientId = undefined;
  if (
    c.operation === "workspace.template.metadata" &&
    record.result !== undefined
  )
    clientId =
      operations[c.operation].response.parse(record.result).clientId ??
      undefined;
  if (
    record.result !== undefined &&
    (c.operation === "workspace.template.create" ||
      c.operation === "workspace.template.from-campaign" ||
      c.operation === "workspace.template.duplicate")
  ) {
    const created = operations[c.operation].response.parse(
      record.result,
    ).template;
    templateId = created.id;
    clientId = created.clientId ?? undefined;
  }
  if (templateId) {
    const detail = await api.request(
      "workspace.template",
      { params: { templateId }, query: { clientId } },
      { signal },
    );
    guard();
    if (detail.template.id !== templateId)
      throw new Error(
        "The current template response does not match the original command.",
      );
    return detail;
  }
}
