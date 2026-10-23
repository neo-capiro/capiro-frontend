import { readFileSync } from "node:fs";
import { z } from "zod";

const text = z.string().trim().min(1);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const pin = z.strictObject({ commit: sha, image: digest });
const receiptIds = z.array(text).min(1);

/** Operator evidence, not runtime authority. No secrets or browser overrides belong here. */
export const m1ReleaseSchema = z.strictObject({
  schema: z.literal("meri.m1.release/1"),
  deployment: z.strictObject({
    origin: z.literal("https://portfolio-preview.app.capiro.ai"),
    profile: z.literal("restricted-preview"),
    testOnly: z.literal(true),
    operatorApprovalReceiptId: text,
    sourceAndConfigurationReceiptId: text,
  }),
  sources: z.strictObject({ frontend: pin, meri: pin, core: pin }),
  contracts: z.strictObject({
    applicationPackage: z.literal("0.1.11"),
    eventWire: z.literal("0.1.0"),
    lifecycleWire: z.literal("0.1.0"),
    installedHashesReceiptId: text,
  }),
  identity: z
    .strictObject({
      issuer: z.url(),
      audience: text,
      nativeSubject: text,
      actorId: text,
      tenantId: text,
      clientId: z.uuid(),
      otherClientId: z.uuid(),
      mappingReceiptId: text,
    })
    .refine((identity) => identity.clientId !== identity.otherClientId),
  prerequisites: z.strictObject({
    migrationsAndGrants: receiptIds,
    workerCompositionReceiptId: text,
    secretReferenceInventoryReceiptId: text,
    rollbackReceiptId: text,
  }),
  slices: z
    .array(
      z.strictObject({
        id: text,
        enabled: z.boolean(),
        positiveReceiptIds: z.array(text),
        negativeReceiptIds: z.array(text),
        unknownRecoveryReceiptIds: z.array(text),
      }),
    )
    .refine(
      (slices) =>
        slices.some((slice) => slice.id === "conversation" && slice.enabled) &&
        slices.every(
          (slice) =>
            slice.id === "conversation" ||
            !slice.enabled ||
            (slice.positiveReceiptIds.length > 0 &&
              slice.negativeReceiptIds.length > 0 &&
              slice.unknownRecoveryReceiptIds.length > 0),
        ),
    ),
});

/** Explicit opt-in is required even to read operator state; the ordinary local run is inert. */
export function readM1LiveRelease(
  env: Record<string, string | undefined>,
  read: (path: string) => string = (path) => readFileSync(path, "utf8"),
) {
  if (env.MERI_M1_LIVE !== "1") return null;
  if (!env.MERI_M1_LIVE_MANIFEST || !env.MERI_M1_STORAGE_STATE)
    throw new Error(
      "M1 preview requires an approved manifest and test-account storage state",
    );
  return m1ReleaseSchema.parse(JSON.parse(read(env.MERI_M1_LIVE_MANIFEST)));
}
