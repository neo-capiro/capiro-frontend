import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileMemberOptionsSchema } from "./profile-receipts";
import { assertProfileSource, type ProfileSource } from "./profile-source";

// Core PR2399 0783423a. Rank assignment never grants client/wall access.
export const ownerLabels = [
  "Primary",
  "Secondary",
  "Tertiary",
  "Quaternary",
] as const;
const uuid = z.uuid().transform((value) => value.toLowerCase());
const ownerSchema = z
  .object({
    userId: uuid,
    rank: z.number().int().min(1).max(4),
    label: z.enum(ownerLabels),
    available: z.boolean(),
    person: z
      .object({
        id: uuid,
        email: z.email(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
      })
      .nullable(),
  })
  .refine((owner) =>
    owner.available ? owner.person?.id === owner.userId : owner.person === null,
  );
const orderedSchema = z
  .object({
    tenantId: uuid,
    clientId: uuid,
    version: z.number().int().min(0).max(2147483647),
    owners: z.array(ownerSchema).max(4),
  })
  .refine(
    ({ owners }) =>
      new Set(owners.map((owner) => owner.userId)).size === owners.length &&
      owners.every(
        (owner, index) =>
          owner.rank === index + 1 && owner.label === ownerLabels[index],
      ),
  );
export type OrderedOwners = z.infer<typeof orderedSchema>;
export const orderedOwnersSchema = (tenantId: string, clientId: string) =>
  orderedSchema.refine(
    (value) =>
      value.tenantId === tenantId.toLowerCase() &&
      value.clientId === clientId.toLowerCase(),
  );
export const ownerIds = (owners: OrderedOwners) =>
  owners.owners.map((owner) => owner.userId);
export const sameOwnerOrder = (owners: OrderedOwners, ids: string[]) =>
  JSON.stringify(ownerIds(owners)) === JSON.stringify(ids);
export const ownerReplacementSchema = z
  .object({
    expectedVersion: z.number().int().min(0).max(2147483647),
    userIds: z
      .array(uuid)
      .max(4)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict();
export type OwnerAttempt = z.infer<typeof ownerReplacementSchema>;
export function ownerReplacementReceipt(
  base: OrderedOwners,
  input: OwnerAttempt,
) {
  const version = base.version + (sameOwnerOrder(base, input.userIds) ? 0 : 1);
  return orderedOwnersSchema(base.tenantId, base.clientId).refine(
    (saved) =>
      saved.version === version &&
      sameOwnerOrder(saved, input.userIds) &&
      saved.owners.every((owner) => owner.available),
  );
}
export async function readOrderedOwners(
  api: ApiClient,
  clientId: string,
  actor: ProfileActor,
  signal: AbortSignal,
  assert: () => void,
) {
  assert();
  const result = await api.request(
    "core",
    `clients/${encodeURIComponent(clientId)}/account-owners`,
    orderedOwnersSchema(actor.tenantId, clientId),
    { signal },
  );
  signal.throwIfAborted();
  assert();
  return result;
}
export async function replaceOrderedOwners(
  api: ApiClient,
  cache: QueryClient,
  context: {
    actor: ProfileActor;
    base: OrderedOwners;
    source: ProfileSource;
    options: ProfileSource;
  },
  input: OwnerAttempt,
  signal: AbortSignal,
  onDispatch: (input: OwnerAttempt) => void,
) {
  const body = ownerReplacementSchema.parse(input);
  const assert = () => {
    signal.throwIfAborted();
    assertProfileActor(cache, context.actor, true);
    assertProfileSource(cache, context.source);
    assertProfileSource(cache, context.options);
    const members = profileMemberOptionsSchema.parse(
      cache.getQueryData(context.options.key),
    );
    const saved = orderedOwnersSchema(
      context.actor.tenantId,
      context.base.clientId,
    ).parse(cache.getQueryData(context.source.key));
    if (
      body.expectedVersion !== context.base.version ||
      saved.version !== context.base.version ||
      !sameOwnerOrder(saved, ownerIds(context.base))
    )
      throw new ApiError(
        409,
        "The saved owner order changed. Read current owners before saving again.",
      );
    if (
      body.userIds.some(
        (id) => !members.some((member) => member.id.toLowerCase() === id),
      )
    )
      throw new ApiError(
        400,
        "Choose current available members for every assigned owner position.",
      );
  };
  assert();
  onDispatch(body);
  const receipt = await api.request(
    "core",
    `clients/${encodeURIComponent(context.base.clientId)}/account-owners`,
    ownerReplacementReceipt(context.base, body),
    { method: "PUT", body, signal },
  );
  signal.throwIfAborted();
  assertProfileActor(cache, context.actor, true);
  assertProfileSource(cache, context.source);
  return receipt;
}
