import {
  createNewsletterLayout,
  defaultNewsletterConfig,
  type NewsletterOutreachRecord,
  type NewsletterOutreachVersion,
  type NewsletterSendReadback,
} from "@capiro/shared/newsletter";
export const recordId = "11111111-1111-4111-8111-111111111111";
export const stageId = "22222222-2222-4222-8222-222222222222";
export const documentId = "33333333-3333-4333-8333-333333333333";
export const versionId = "44444444-4444-4444-8444-444444444444";
export const senderId = "55555555-5555-4555-8555-555555555555";
export const intentId = "66666666-6666-4666-8666-666666666666";
export const requestKey = "77777777-7777-4777-8777-777777777777";
export const otherId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const mailbox = {
  id: senderId,
  provider: "google_workspace" as const,
  accountEmail: "author@example.test",
  displayName: "Synthetic Author",
  availability: "available" as const,
  signaturePolicy: "actor" as const,
};
export function preparedVersion(): NewsletterOutreachVersion {
  return {
    id: versionId,
    artifactId: otherId,
    outreachRecordId: recordId,
    version: 1,
    sourceVersionId: null,
    generationKey: "newsletter:synthetic",
    recipientKey: "newsletter:synthetic",
    audienceKind: "individual",
    subject: "Synthetic weekly briefing",
    body: "<!doctype html><html><body><h1>Prepared for Taylor</h1><p>Immutable synthetic content.</p></body></html>",
    contentHash: `sha256:${"a".repeat(64)}`,
    generationStatus: "manually_authored",
    auditStatus: "not_required",
    approvalStatus: "not_required",
    auditDecision: null,
    auditChecks: [],
    reviewRequestId: null,
    provider: null,
    model: null,
    promptSpecVersion: null,
    sendable: true,
    createdAt: "2026-10-26T10:00:00.000Z",
    recipientEmail: "taylor@example.test",
  };
}
export function deliveryRecord(prepared = true): NewsletterOutreachRecord {
  return {
    id: recordId,
    status: "draft",
    name: "Synthetic weekly briefing",
    stage: {
      id: stageId,
      documentId,
      revision: 4,
      name: "Synthetic weekly briefing",
      config: {
        ...defaultNewsletterConfig(),
        clientId: null,
        company: "Synthetic Firm",
        mailingAddress: "1 Synthetic Street",
        subject: "Synthetic weekly briefing",
      },
      design: createNewsletterLayout(1),
    },
    targets: prepared
      ? [{ email: "taylor@example.test", name: "Taylor Reed", cc: [], bcc: [] }]
      : [],
    senderConnectionId: prepared ? senderId : null,
    subject: "Synthetic weekly briefing",
    versions: prepared ? [preparedVersion()] : [],
    intentId: null,
    excluded: [],
    tests: [],
  };
}
export function sendReadback(
  testMode = false,
  status = "queued",
): NewsletterSendReadback {
  const time = "2026-10-26T10:00:00.000Z";
  return {
    outreachRecordId: recordId,
    requestKey,
    intent: {
      id: intentId,
      outreachRecordId: recordId,
      requestKey,
      senderConnectionId: senderId,
      versionIds: [versionId],
      status,
      testMode,
      totals: { total: 1, pending: 1 },
      error: null,
      startedAt: null,
      finishedAt: null,
      createdAt: time,
      deliveries: [
        {
          id: otherId,
          generationKey: "newsletter:synthetic",
          recipientKey: "newsletter:synthetic",
          status: "pending",
          attempt: 0,
          provider: "gmail",
          correlationId: otherId,
          to: [
            {
              email: testMode ? "account@example.test" : "taylor@example.test",
              name: null,
            },
          ],
          cc: [],
          bcc: [],
          subject: "Synthetic weekly briefing",
          providerMessageId: null,
          providerThreadId: null,
          providerDraftId: null,
          errorCode: null,
          errorMessage: null,
          acceptedAt: null,
        },
      ],
    },
  };
}
