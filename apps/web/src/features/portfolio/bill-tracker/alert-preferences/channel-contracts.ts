import { z } from "zod";
import type { TrackerBackend } from "@/shared/portfolio/config/config";

export const phoneRequestSchema = z
  .object({ phone: z.string().min(1).max(20) })
  .strict();
export const phoneConfirmBodySchema = phoneRequestSchema.extend({
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code."),
});
export const phoneRequestReceiptSchema = z.object({
  dormant: z.boolean(),
  masked: z.string().min(1),
  devCode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});
export type PhoneRequestReceipt = z.infer<typeof phoneRequestReceiptSchema>;
export const phoneConfirmReceiptSchema = (phone: string) =>
  z.object({
    verified: z.literal(true),
    phone: z.literal(phone),
  });
export const testChannels = ["email", "sms"] as const;
export type TestChannel = (typeof testChannels)[number];
export const testAlertBodySchema = z
  .object({
    channels: z
      .array(z.enum(testChannels))
      .min(1)
      .max(2)
      .refine(
        (values) => new Set(values).size === values.length,
        "Choose each test channel once.",
      ),
  })
  .strict();
const testResultSchema = z.object({
  channel: z.enum(testChannels),
  status: z.enum(["sent", "skipped", "failed", "suppressed"]),
  detail: z.string().optional(),
});
export type TestAlertResult = z.infer<typeof testResultSchema>;
export function testAlertReceiptSchema(channels: readonly TestChannel[]) {
  return z
    .array(testResultSchema)
    .refine(
      (results) =>
        results.length === channels.length &&
        new Set(results.map((result) => result.channel)).size ===
          channels.length &&
        results.every((result) => channels.includes(result.channel)),
      "The service did not return one result for each requested channel.",
    );
}
export const channelPath = (
  clientId: string,
  backend: TrackerBackend,
  action: "sms/verify/start" | "sms/verify/confirm" | "test-alert",
) =>
  backend === "core"
    ? `intelligence/clients/${encodeURIComponent(clientId)}/tracker/${action}`
    : `clients/${encodeURIComponent(clientId)}/tracker/${action}`;
export const testResultLabel: Record<TestAlertResult["status"], string> = {
  sent: "Provider accepted",
  skipped: "Skipped by the service",
  failed: "Service reported failure",
  suppressed: "Suppressed by the service",
};
