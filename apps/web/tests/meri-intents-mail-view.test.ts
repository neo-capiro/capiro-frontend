import { expect, it } from "vitest";
import type {
  Canonical_MailSendApprovalProposalC6Ab2C41,
  IntentsExecutionOutcome,
  IntentsNativeMailOutcome,
  IntentsProposal,
  IntentsProposalItem,
} from "@capiro/meri-client/intents";
import {
  isMailSendProposal,
  mailFields,
  mailOutcomeSettled,
  mailRow,
} from "../src/features/meri/conversation/intents/mail-view";

const binding = {
  tenantId: "tenant-1",
  actorId: "actor-1",
  conversationId: "conversation-1",
  runId: "run-1",
  attemptId: "attempt-1",
  workerId: "worker-1",
  writerFence: 1,
};

const baseProposal: Canonical_MailSendApprovalProposalC6Ab2C41 = {
  proposalId: "proposal-1",
  command: {
    contractVersion: "0.2.0",
    commandId: "command-1",
    binding,
    action: "mail.send",
    arguments: {
      mode: "send",
      clientId: null,
      senderConnectionId: "connection-1",
      senderEmail: "sender@example.com",
      to: ["recipient@example.com"],
      cc: [],
      bcc: [],
      subject: "Test subject",
      bodyHtml: "<p>Test&nbsp;body</p><script>alert(1)</script>",
      files: [],
      original: null,
    },
    attachments: [],
    scopes: [
      {
        tenantId: "tenant-1",
        kind: "mailbox",
        resourceId: "mailbox-1",
        policyRevision: "rev-1",
      },
    ],
    idempotencyKey: "idempotency-1",
  },
  commandSha256: "command-sha-1",
  createdAt: "2026-10-27T00:00:00Z",
  expiresAt: "2026-10-27T01:00:00Z",
  requiredApprover: { tenantId: "tenant-1", actorId: "actor-1" },
};

const mailItem = (
  overrides: Partial<IntentsProposalItem> = {},
): IntentsProposalItem => ({
  deliveryId: "delivery-1",
  createdAt: "2026-10-27T00:00:00Z",
  operation: { id: "mail.send", version: "0.2.0" },
  state: "prepared",
  kind: "proposal",
  proposal: baseProposal,
  decision: null,
  execution: null,
  phase: "awaiting_approval",
  ...overrides,
});

const viewer = { tenantId: "tenant-1", actorId: "actor-1" };
const now = Date.parse("2026-10-27T00:30:00Z");

const fieldsOf = (proposal: Canonical_MailSendApprovalProposalC6Ab2C41) =>
  Object.fromEntries(
    mailFields(proposal).map((field) => [field.label, field.value]),
  );

const acceptedOutcome = (
  overrides: Partial<
    Extract<IntentsNativeMailOutcome["result"], { state: "accepted" }>
  > = {},
): IntentsNativeMailOutcome => ({
  execution: {
    kind: "native-mail",
    proposalId: "proposal-1",
    commandSha256: "command-sha-1",
    idempotencyKey: "idempotency-1",
    binding,
    approvalDecisionSha256: "decision-sha-1",
  },
  result: {
    state: "accepted",
    intentId: "intent-1",
    requestKey: "request-1",
    retryable: false,
    threadId: "thread-1",
    messageId: "message-1",
    provider: "gmail",
    senderConnectionId: "connection-1",
    senderEmail: "sender@example.com",
    mode: "send",
    original: null,
    signaturePolicy: "actor",
    signatureAppended: false,
    mailboxConfirmation: "confirmed",
    ...overrides,
  },
});

const failedOutcome: IntentsNativeMailOutcome = {
  execution: {
    kind: "native-mail",
    proposalId: "proposal-1",
    commandSha256: "command-sha-1",
    idempotencyKey: "idempotency-1",
    binding,
    approvalDecisionSha256: "decision-sha-1",
  },
  result: {
    state: "failed",
    intentId: "intent-1",
    requestKey: "request-1",
    retryable: false,
  },
};

const completed = (
  outcome: IntentsExecutionOutcome,
): IntentsProposalItem["execution"] => ({ state: "completed", outcome });

it("recognizes only canonical mail.send proposals", () => {
  expect(isMailSendProposal(baseProposal as IntentsProposal)).toBe(true);
  const taskProposal = {
    proposalId: "proposal-2",
    command: {
      contractVersion: "0.1.0",
      commandId: "command-2",
      binding,
      action: "task.create",
      arguments: {},
      attachments: [],
      scopes: [],
      idempotencyKey: "idempotency-2",
    },
    commandSha256: "command-sha-2",
    createdAt: "2026-10-27T00:00:00Z",
    expiresAt: "2026-10-27T01:00:00Z",
    requiredApprover: { tenantId: "tenant-1", actorId: "actor-1" },
  } as unknown as IntentsProposal;
  expect(isMailSendProposal(taskProposal)).toBe(false);
});

it("settles a mail decision only on an exact native-mail accepted or failed outcome", () => {
  expect(mailOutcomeSettled(acceptedOutcome())).toBe(true);
  expect(mailOutcomeSettled(failedOutcome)).toBe(true);
  const taskOutcome = {
    execution: { kind: "native-task" },
    result: { state: "accepted" },
  } as unknown as IntentsExecutionOutcome;
  expect(mailOutcomeSettled(taskOutcome)).toBe(false);
});

it("shows exact send details before approval and never a raw provider identifier", () => {
  const fields = fieldsOf(baseProposal);
  expect(fields).toMatchObject({
    Action: "Send an email",
    Mode: "Send a new message",
    From: "sender@example.com",
    To: "recipient@example.com",
    Cc: "None",
    Bcc: "None",
    Subject: "Test subject",
    Message: "Test body",
    Scope: "mailbox mailbox-1",
    Expires: "2026-10-27T01:00:00Z",
    "Command hash": "command-sha-1",
  });
  expect(fields["Original message"]).toBeUndefined();
  expect(fields["Original thread"]).toBeUndefined();
  expect(fields.Attachments).toBeUndefined();
  const rendered = JSON.stringify(fields);
  expect(rendered).not.toContain("connection-1");
  expect(rendered).not.toContain("alert(1)");
  const longBody = `${"Full retained message ".repeat(110)}Final approval detail`;
  const longProposal = {
    ...baseProposal,
    command: {
      ...baseProposal.command,
      arguments: { ...baseProposal.command.arguments, bodyHtml: longBody },
    },
  };
  expect(fieldsOf(longProposal).Message).toBe(longBody);
});

it("shows the original message revision and attachment proof for reply and forward modes", () => {
  const replyProposal: Canonical_MailSendApprovalProposalC6Ab2C41 = {
    ...baseProposal,
    command: {
      ...baseProposal.command,
      arguments: {
        ...baseProposal.command.arguments,
        mode: "reply_all",
        cc: ["colleague@example.com"],
        original: {
          threadId: "thread-1",
          messageId: "message-1",
          updatedAt: "2026-10-26T23:00:00Z",
          bodySha256: null,
        },
        files: [
          {
            attachmentId: "attachment-1",
            fileName: "evidence.pdf",
            contentType: "application/pdf",
            bytes: 1234,
            sha256: "file-sha-1",
          },
        ],
      },
    },
  };
  const fields = fieldsOf(replyProposal);
  expect(fields).toMatchObject({
    Mode: "Reply to everyone on the original message",
    Cc: "colleague@example.com",
    "Original thread": "thread-1",
    "Original message": "message-1",
    "Original revision": "2026-10-26T23:00:00Z",
    Attachments: "evidence.pdf (1234 bytes)",
  });
  expect(fields["Original body hash"]).toBeUndefined();

  const forwardProposal: Canonical_MailSendApprovalProposalC6Ab2C41 = {
    ...replyProposal,
    command: {
      ...replyProposal.command,
      arguments: {
        ...replyProposal.command.arguments,
        mode: "forward",
        original: {
          threadId: "thread-1",
          messageId: "message-1",
          updatedAt: "2026-10-26T23:00:00Z",
          bodySha256: "body-sha-1",
        },
      },
    },
  };
  expect(fieldsOf(forwardProposal)).toMatchObject({
    Mode: "Forward the original message",
    "Original body hash": "body-sha-1",
  });
});

it("offers a decision only to the current approver and never sends during preview", () => {
  const row = mailRow(mailItem(), now, viewer);
  expect(row).toMatchObject({
    title: "Email for your approval",
    decision: "approvable",
    status: "Awaiting your decision",
    tone: "neutral",
  });
  expect(row?.detail).toContain("Nothing happens unless you approve");
  expect(row?.detail).toContain("Sending does not happen during preview");
  expect(row?.result).toEqual([]);

  const foreign = mailRow(mailItem(), now, {
    tenantId: "tenant-1",
    actorId: "actor-2",
  });
  expect(foreign).toMatchObject({
    decision: "closed",
    status: "Needs another approver",
  });
});

it("closes an expired or rejected proposal without any decision", () => {
  expect(mailRow(mailItem({ phase: "expired" }), now, viewer)).toMatchObject({
    decision: "closed",
    status: "Expired",
  });
  const rejected = mailRow(mailItem({ phase: "rejected" }), now, viewer);
  expect(rejected).toMatchObject({ decision: "closed", status: "Rejected" });
  expect(rejected?.detail).toContain("Nothing was sent");
  const lapsed = mailRow(
    mailItem({
      proposal: { ...baseProposal, expiresAt: "2026-10-27T00:15:00Z" },
    }),
    now,
    viewer,
  );
  expect(lapsed).toMatchObject({ decision: "closed", status: "Expired" });
});

it("reports provider acceptance without claiming delivery", () => {
  const row = mailRow(
    mailItem({ phase: "completed", execution: completed(acceptedOutcome()) }),
    now,
    viewer,
  );
  expect(row).toMatchObject({
    decision: "closed",
    status: "Accepted by provider",
    tone: "success",
  });
  expect(row?.detail).toContain("Provider acceptance is not proof of delivery");
  expect(row?.detail).toContain("Gmail");
  expect(row?.detail).not.toContain("Sent");
  expect(
    Object.fromEntries((row?.result ?? []).map((f) => [f.label, f.value])),
  ).toMatchObject({
    State: "Accepted by provider",
    Provider: "Gmail",
    Mode: "Send a new message",
    "Signature policy": "Sent as the approving actor",
    "Mailbox confirmation": "Confirmed",
  });
});

it("reports a failed provider send without ever saying it was sent", () => {
  const row = mailRow(
    mailItem({ phase: "completed", execution: completed(failedOutcome) }),
    now,
    viewer,
  );
  expect(row).toMatchObject({
    decision: "closed",
    status: "Not sent",
    tone: "danger",
  });
  expect(row?.detail).toContain("It was not sent");
  expect(row?.detail).not.toContain("Sent");
});

it("treats an unknown, unreadable or mismatched outcome as uncertain and never re-sends", () => {
  const unknown = mailRow(mailItem({ phase: "unknown" }), now, viewer);
  expect(unknown).toMatchObject({
    decision: "closed",
    status: "Result uncertain",
    tone: "warning",
  });
  expect(unknown?.detail).toContain("will not be sent again");

  const decisionUnknown = mailRow(
    mailItem({ phase: "unknown_decision" }),
    now,
    viewer,
  );
  expect(decisionUnknown).toMatchObject({
    decision: "closed",
    status: "Decision status unavailable",
    tone: "warning",
  });
  expect(decisionUnknown?.detail).toContain("Refresh to check");

  for (const execution of [
    "unavailable" as const,
    null,
    completed({
      execution: { kind: "native-task" },
      result: {},
    } as unknown as IntentsExecutionOutcome),
  ]) {
    const row = mailRow(
      mailItem({ phase: "completed", execution }),
      now,
      viewer,
    );
    expect(row).toMatchObject({
      decision: "closed",
      status: "Result uncertain",
      tone: "warning",
    });
    expect(row?.detail).toContain("will not be sent again");
  }
});

it("ignores a non-mail item so the generic card owns it", () => {
  expect(
    mailRow(
      mailItem({
        proposal: {
          kind: "research_share",
        } as unknown as IntentsProposalItem["proposal"],
      }),
      now,
      viewer,
    ),
  ).toBeNull();
});
