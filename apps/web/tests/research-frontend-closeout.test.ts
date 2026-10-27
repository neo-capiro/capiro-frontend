import { expect, it } from "vitest";
import {
  csvHeaders,
  readImportFile,
} from "../src/features/modules/research-portfolios/research-import-file";
import { replyQuote } from "../src/features/portfolio/relationships/email/reply-quote";
import type { MailBody } from "../src/features/portfolio/relationships/email/read";
import { plainMailHtml } from "../src/features/portfolio/relationships/email/mail-body";
import {
  grantedScopeCard,
  coverageNotice,
} from "../src/features/meri/screens/settings/connections-view";
import { integrationSchema } from "../src/shared/capiro/operations/settings-schemas";
import { researchImportOperations } from "../src/shared/capiro/operations/research-imports";
import { researchOutputOperations } from "../src/shared/capiro/operations/research-outputs";
import { researchDraftOperations } from "../src/shared/capiro/operations/research-drafts";
import type { z } from "zod";

it("permits the canonical draft character ceiling within bounded JSON wire limits", () => {
  const operation = researchDraftOperations["research.drafts.version"];
  for (const bodyText of ["界".repeat(500000), "\u0001".repeat(500000)]) {
    const input = {
      params: { artifactId: "20000000-0000-4000-8000-000000000003" },
      body: { bodyText },
    };
    expect(operation.request.safeParse(input).success).toBe(true);
    expect(
      new TextEncoder().encode(JSON.stringify(input)).byteLength,
    ).toBeLessThan(operation.requestLimitBytes!);
  }
  expect(
    operation.request.safeParse({
      params: { artifactId: "20000000-0000-4000-8000-000000000003" },
      body: { bodyText: "a".repeat(500001) },
    }).success,
  ).toBe(false);
});

it("maps quoted CSV headers without consuming the first data row and preserves original bytes", async () => {
  const csv =
    '\uFEFF"target_kind","Name, quoted","two\nlines"\r\nprogram_element,PE0001,value';
  expect(csvHeaders(csv)).toEqual([
    "target_kind",
    "Name, quoted",
    "two\nlines",
  ]);
  const file = await readImportFile(
    new File([csv], "members.csv", { type: "text/csv" }),
  );
  expect(Buffer.from(file.contentBase64, "base64").toString("utf8")).toBe(csv);
  await expect(readImportFile(new File([], "empty.csv"))).rejects.toThrow(
    "5 MB",
  );
  expect(() => csvHeaders('"unfinished')).toThrow("unfinished");
});
const original: MailBody = {
  id: "10000000-0000-4000-8000-000000000001",
  threadId: "10000000-0000-4000-8000-000000000002",
  subject: "Budget <review>",
  fromEmail: "sender@example.test",
  fromName: "Sender",
  toRecipients: [],
  ccRecipients: [],
  bodyText: '<img src="https://external.invalid/pixel">\nSecond line',
  bodyOffset: 0,
  bodyLength: 62,
  bodyTruncated: false,
  nextBodyOffset: null,
  bodySha256: "a".repeat(64),
  bodyStoredPresent: true,
  bodyCompleteness: "full",
  sentAt: null,
  receivedAt: null,
  createdAt: "2026-10-27T00:00:00Z",
};
it("quotes the verified original visibly as escaped editable text and labels incomplete originals", () => {
  const quote = replyQuote(original);
  expect(quote).toContain("From: Sender <sender@example.test>");
  expect(quote).toContain("> Second line");
  expect(plainMailHtml(quote)).not.toContain("<img src=");
  expect(plainMailHtml(quote)).toContain("&lt;img");
  expect(replyQuote({ ...original, bodyCompleteness: "preview" })).toContain(
    "excerpt",
  );
  expect(replyQuote({ ...original, bodyStoredPresent: false })).toBe("");
  expect(
    replyQuote({ ...original, bodyText: "\n".repeat(5900) }).length,
  ).toBeLessThan(8000);
});
it("does not mistake equally sized different scope sets for verified requested permissions", () => {
  const connection = {
    id: "connection",
    displayName: null,
    lastSyncAt: null,
    provider: "microsoft_365",
    status: "needs_configuration",
    accountEmail: "owner@example.test",
    scopes: ["Mail.Read", "Mail.Send"],
    permissions: {
      requestedScopes: ["Mail.Read", "Mail.Send"],
      grantedScopes: ["Mail.Read", "Calendars.Read", "Mail.Read"],
      lastVerifiedAt: null,
    },
    mailCoverage: undefined,
    lastError: "Reconnect to approve Mail.Send.",
  } as z.infer<typeof integrationSchema>;
  expect(
    grantedScopeCard(connection, {
      title: "Scopes",
      description: "",
      notice: { title: "", detail: "" },
    }).description,
  ).toContain("1 of 2");
  expect(
    grantedScopeCard(connection, {
      title: "Scopes",
      description: "",
      notice: { title: "", detail: "" },
    }).description,
  ).toContain("Missing requested scopes: Mail.Send");
  expect(coverageNotice(connection).detail).toContain(
    "Reconnect to approve Mail.Send",
  );
});
it("rejects arbitrary import actions and cross-resource path fragments before transport", () => {
  const id = "10000000-0000-4000-8000-000000000001";
  const operation = researchImportOperations["research.imports.action"];
  expect(
    operation.request.safeParse({
      params: { id, jobId: id, action: "delete-all" },
      body: { operationKey: "key" },
    }).success,
  ).toBe(false);
  expect(
    operation.request.safeParse({
      params: { id, jobId: "../other-client", action: "apply" },
      body: { operationKey: "key" },
    }).success,
  ).toBe(false);
  expect(
    researchOutputOperations["research.outputs.download"].request.safeParse({
      params: { id, outputId: id },
      query: { url: "https://external.invalid" },
    }).success,
  ).toBe(false);
});
