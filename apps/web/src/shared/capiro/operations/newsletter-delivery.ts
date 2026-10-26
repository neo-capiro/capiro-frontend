import { z } from "zod";
import { defineOperation } from "../contracts";
import { richNewsletterId } from "./newsletter-routing";

const source =
  "capiro-backend@2cd1af008917c5484fb2ce86aa7e3bf2bf93dba7 NewsletterOutreachController/Service";
const params = z.object({ id: richNewsletterId }).strict();
export const newsletterDestinationInput = z
  .object({
    email: z.email().max(320),
    name: z.string().max(200).optional(),
    clientId: z.uuid().optional(),
    directoryContactId: z.string().max(200).optional(),
    company: z.string().max(200).optional(),
    phone: z.string().max(100).optional(),
    cc: z.array(z.email()).max(50).optional(),
    bcc: z.array(z.email()).max(50).optional(),
  })
  .strict();
export const newsletterPrepareInput = z
  .object({
    recipients: z.array(newsletterDestinationInput).min(1).max(500),
    targets: z.array(z.record(z.string(), z.unknown())).max(500),
    senderConnectionId: z.uuid(),
    subject: z.string().min(1).max(300),
  })
  .strict();
export const newsletterSendInput = z
  .object({
    requestKey: z
      .string()
      .min(8)
      .max(128)
      .refine((value) => value === value.trim()),
    senderConnectionId: z.uuid(),
    versionIds: z.array(z.uuidv4()).min(1).max(500),
  })
  .strict();
export type NewsletterDestinationInput = z.infer<
  typeof newsletterDestinationInput
>;
export type NewsletterPrepareInput = z.infer<typeof newsletterPrepareInput>;
export type NewsletterSendInput = z.infer<typeof newsletterSendInput>;
const mutate = (
  path: string,
  body: typeof newsletterPrepareInput | typeof newsletterSendInput,
) =>
  defineOperation({
    service: "core",
    method: "POST",
    path,
    request: z.object({ params, body }).strict(),
    response: z.unknown(),
    source,
  });
/** Bound public replies are received by the feature adapter, after capturing the request. */
export const newsletterDeliveryOperations = {
  "engagement.newsletter.prepare": mutate(
    "/engagement/newsletters/:id/prepare",
    newsletterPrepareInput,
  ),
  "engagement.newsletter.test": mutate(
    "/engagement/newsletters/:id/test",
    newsletterSendInput,
  ),
  "engagement.newsletter.send": mutate(
    "/engagement/newsletters/:id/send",
    newsletterSendInput,
  ),
  "engagement.newsletter.sendRequest": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/newsletters/:id/send-requests/:requestKey",
    request: z
      .object({
        params: params.extend({
          requestKey: newsletterSendInput.shape.requestKey,
        }),
      })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "engagement.newsletter.sendStatus": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/newsletters/:id/send-intents/:intentId",
    request: z
      .object({ params: params.extend({ intentId: richNewsletterId }) })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "engagement.newsletter.mailboxes": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/mail/mailboxes",
    request: z.object({}).strict(),
    response: z.unknown(),
    source:
      "Existing EngagementService.listSendingMailboxes owned connected mailbox projection",
  }),
  "engagement.newsletter.clientPeople": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients/:clientId/people",
    request: z
      .object({ params: z.object({ clientId: richNewsletterId }).strict() })
      .strict(),
    response: z.unknown(),
    source:
      "Existing ClientPeopleController.listPeople; received with the existing Portfolio person schema",
  }),
} as const;
