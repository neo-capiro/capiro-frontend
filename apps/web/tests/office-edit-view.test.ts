import { describe, expect, it } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import {
  intentRow,
  refusalMessage,
} from "../src/features/meri/conversation/intents/intent-view";
import {
  officeEditExplanation,
  officeEditSettled,
  officeUnitLabel,
  type OfficeEditListItem,
} from "../src/features/meri/conversation/intents/office-edit-view";
import { intentDecisionSettled } from "../src/features/meri/conversation/intents/research-share-view";
import {
  conversationId,
  officeDecideResponse,
  officeEditFixture,
  officeIds,
  officeListResponse,
  viewer,
} from "./office-edit-fixture";
import { canonicalSha256 } from "./meri-action-wire-fixtures";

const fields = (row: ReturnType<typeof intentRow>) =>
  Object.fromEntries(row.fields.map((f) => [f.label, f.value]));
const text = (row: ReturnType<typeof intentRow>) =>
  [
    row.title,
    row.status,
    row.detail,
    ...row.fields.map((f) => `${f.label} ${f.value}`),
    ...row.result.map((f) => `${f.label} ${f.value}`),
    row.officeVersion?.note ?? "",
  ].join("\n");

describe("office proposal card", () => {
  it("an awaiting proposal is the person's decision and shows every change in words with its before and after", () => {
    const item = officeEditFixture();
    const row = intentRow(item, Date.now(), viewer);
    expect(row).toMatchObject({
      decision: "approvable",
      status: "Awaiting your decision",
      title: "Edit Quarterly report.docx",
      tone: "warning",
    });
    expect(row.detail).toContain(
      "If a newer version is published first, Apply changes nothing",
    );
    expect(fields(row)).toMatchObject({
      Document: "Quarterly report.docx",
      Kind: "Word document",
      Summary: item.proposal.summary,
      "Change 1": "Replace text · paragraph 1",
      "Change 1 before": "Quarterly report — Ω",
      "Change 1 after": "Quarterly report — Ω (final)",
      "Change 2": "Insert after · paragraph 4",
      "Change 2 before": "(nothing: a new unit is inserted)",
      "Change 2 after": "Added line",
    });
    expect(row.officeVersion).toBeUndefined();
  });
  it("no identifier, hash, unit id or refusal code reaches the person's copy", () => {
    for (const status of [
      "proposed",
      "applied",
      "conflict",
      "refused",
      "rejected",
      "expired",
      "unknown",
    ] as const) {
      const row = intentRow(
        officeEditFixture(
          status,
          status === "conflict" ? "OFFICE_EDIT_STALE_HEAD" : null,
        ),
        Date.now(),
        viewer,
      );
      const copy = text(row);
      expect(copy).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
      expect(copy).not.toMatch(/[0-9a-f]{64}/);
      expect(copy).not.toMatch(/OFFICE_EDIT_|INTENT_/);
      expect(copy).not.toMatch(/\bp:\d|slide:\d|shape:\d/);
    }
    expect(officeUnitLabel("Data!B2")).toBe("cell B2 on sheet Data");
    expect(officeUnitLabel("slide:1/shape:2")).toBe("slide 1, shape 2");
    expect(officeUnitLabel("p:12")).toBe("paragraph 12");
  });
  it("only the person who asked can apply; an expired proposal closes", () => {
    const other = intentRow(officeEditFixture(), Date.now(), {
      tenantId: viewer.tenantId,
      actorId: "someone-else",
    });
    expect(other).toMatchObject({
      decision: "held",
      status: "Awaiting another approver",
    });
    const expired = intentRow(
      officeEditFixture("proposed", null, -1),
      Date.now(),
      viewer,
    );
    expect(expired).toMatchObject({ decision: "closed", status: "Expired" });
    expect(expired.detail).toContain("ask Meri again from the latest version");
  });
  it("an applied proposal says it was saved from Meri's edit and offers the editor target", () => {
    const row = intentRow(officeEditFixture("applied"), Date.now(), viewer);
    expect(row).toMatchObject({
      decision: "closed",
      status: "Applied",
      tone: "success",
    });
    expect(
      Object.fromEntries(row.result.map((f) => [f.label, f.value])),
    ).toEqual({
      "Saved as": "Quarterly report.docx",
      "Saved from": "Meri's edit, applied by you",
    });
    expect(row.officeVersion).toMatchObject({
      artifactId: officeIds.artifactId,
      versionId: officeIds.newVersionId,
      parentVersionId: officeIds.versionId,
      filename: "Quarterly report.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      binding: { conversationId },
      note: "New version of Quarterly report.docx, saved from Meri's edit",
    });
  });
  it("conflicts and refusals are explained in plain words", () => {
    const conflict = intentRow(
      officeEditFixture("conflict", "OFFICE_EDIT_STALE_HEAD"),
      Date.now(),
      viewer,
    );
    expect(conflict).toMatchObject({
      decision: "closed",
      status: "Not applied: document changed",
      tone: "danger",
      detail:
        "The document changed since Meri read it: a newer version was saved. Nothing was changed; ask Meri again from the latest version.",
    });
    expect(officeEditExplanation("refused")).toContain(
      "no longer matches the document Meri read",
    );
    expect(officeEditExplanation("expired")).toContain(
      "expired before it was applied",
    );
    expect(
      intentRow(officeEditFixture("rejected"), Date.now(), viewer),
    ).toMatchObject({
      status: "Rejected",
      tone: "neutral",
      detail: "You rejected this proposal. Nothing was changed.",
    });
    expect(
      intentRow(officeEditFixture("unknown"), Date.now(), viewer),
    ).toMatchObject({
      status: "Outcome unknown",
      tone: "warning",
    });
    expect(refusalMessage("EXECUTION_OWNER_UNAVAILABLE")).toContain(
      "not enabled for this deployment",
    );
    expect(refusalMessage("EXECUTION_AUTHORITY_REFUSED")).toContain(
      "Your current access does not allow",
    );
  });
  it("a withheld or unreadable result never offers a decision", () => {
    const item = officeEditFixture();
    expect(
      intentRow({ ...item, result: "unavailable" }, Date.now(), viewer),
    ).toMatchObject({
      decision: "closed",
      status: "Status unavailable",
    });
    const withheld: OfficeEditListItem = {
      deliveryId: item.deliveryId,
      createdAt: item.createdAt,
      operation: item.operation,
      state: "prepared",
      kind: "office_edit",
      withheld: true,
    };
    expect(intentRow(withheld, Date.now(), viewer)).toMatchObject({
      decision: "closed",
      status: "Unavailable",
    });
  });
  it("decisions settle once the owner answered applied, rejected, conflict, refused or expired; proposed and unknown stay open", () => {
    for (const status of [
      "applied",
      "rejected",
      "conflict",
      "refused",
      "expired",
    ] as const)
      expect(intentDecisionSettled(officeDecideResponse(status))).toBe(true);
    for (const status of ["proposed", "unknown"] as const)
      expect(intentDecisionSettled(officeDecideResponse(status))).toBe(false);
    expect(officeEditSettled("applied")).toBe(true);
  });
  it("the vendored public receiver admits the office item and the decide answer, and refuses a tampered proposal digest", async () => {
    const item = officeEditFixture("proposed", null, 60_000, canonicalSha256);
    const request = { conversationId };
    const listed = await receiveIntentsResponse(
      "list",
      200,
      JSON.stringify(officeListResponse(item)),
      { request },
    );
    if ("error" in listed) throw Error("Unexpected refusal");
    expect(listed.intents[0]).toMatchObject({ kind: "office_edit" });
    const decide = {
      conversationId,
      deliveryId: item.deliveryId,
      proposalId: item.proposal.proposalId,
      commandSha256: item.proposal.commandSha256,
      decision: "approved" as const,
    };
    const applied = await receiveIntentsResponse(
      "decide",
      200,
      JSON.stringify(officeDecideResponse("applied")),
      { request: decide, proposal: item.proposal },
    );
    expect(applied).toMatchObject({
      status: "office_edit_decided",
      result: { proposalStatus: "applied" },
    });
    // A rejection the owner settled durably is answered as rejected, whichever tab asks.
    const rejected = await receiveIntentsResponse(
      "decide",
      200,
      JSON.stringify(officeDecideResponse("rejected")),
      {
        request: { ...decide, decision: "rejected" as const },
        proposal: item.proposal,
      },
    );
    expect(rejected).toMatchObject({ result: { proposalStatus: "rejected" } });
    const tampered = {
      ...item,
      proposal: { ...item.proposal, summary: "changed" },
    };
    await expect(
      receiveIntentsResponse(
        "list",
        200,
        JSON.stringify(officeListResponse(tampered)),
        { request },
      ),
    ).rejects.toThrow();
    // An applied answer to a rejection is a contradiction the receiver refuses.
    await expect(
      receiveIntentsResponse(
        "decide",
        200,
        JSON.stringify(officeDecideResponse("applied")),
        {
          request: { ...decide, decision: "rejected" as const },
          proposal: item.proposal,
        },
      ),
    ).rejects.toThrow();
  });
});
