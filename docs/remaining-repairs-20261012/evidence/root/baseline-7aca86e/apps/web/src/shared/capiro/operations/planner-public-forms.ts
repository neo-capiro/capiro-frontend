import { z } from "zod";
import { defineOperation } from "../contracts";
import { plannerAttachmentOperations } from "./planner-attachments";
export const publicFormToken = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/,
  );
const params = z.object({ token: publicFormToken }).strict();
export const publicForm = z.object({
  name: z.string(),
  description: z.string(),
  confirmationMessage: z.string().optional(),
  allowAnotherSubmission: z.boolean().optional(),
  fields: z.array(
    z.object({
      id: z.uuid(),
      label: z.string(),
      description: z.string().optional(),
      type: z.enum([
        "text",
        "paragraph",
        "email",
        "date",
        "number",
        "select",
        "multi_select",
        "attachment",
      ]),
      required: z.boolean(),
      options: z.array(z.string()),
      multiple: z.boolean().optional(),
      maxLength: z.number().optional(),
      showWhen: z
        .object({ questionId: z.uuid(), values: z.array(z.string()) })
        .optional(),
    }),
  ),
});
const source =
  "apps/api-strategy/src/planner/planner-public.controller.ts; planner.service.ts; planner-form.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const received = z.object({ received: z.literal(true) });
const answers = z.record(
  z.uuid(),
  z.union([
    z.string().max(50000),
    z.number().finite(),
    z.array(z.string().max(200)).max(100),
  ]),
);
/** Separate capability-only allowlist. These operations never receive a Clerk bearer. */
export const publicPlannerFormOperations = {
  "public-form.read": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/public/forms/:token",
    request: z.object({ params }).strict(),
    response: publicForm,
    source,
  }),
  "public-form.submit": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/public/forms/:token",
    request: z.object({ params, body: answers }).strict(),
    response: received,
    requestLimitBytes: 250000,
    source,
  }),
  "public-form.upload": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/public/forms/:token",
    request: z
      .object({ params, body: z.object({ answers }).strict() })
      .strict(),
    response: received,
    encoding: "multipart",
    multipart: plannerAttachmentOperations["planner.form.upload"].multipart,
    source,
  }),
} as const;
