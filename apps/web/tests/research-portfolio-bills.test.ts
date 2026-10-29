import { describe, expect, it } from "vitest";
import { researchBillOperations } from "@/shared/capiro/operations/research-bills";
import {
  researchEvent,
  researchMember,
} from "@/shared/capiro/operations/research-schemas";

/**
 * The bill *wire contract* — the part a UI or Meri adapter can get wrong before any
 * request is made. Identity policy lives on the server; these assertions only prove
 * the client cannot express an identity the server would have to guess at.
 */
describe("research bill operations", () => {
  const search = researchBillOperations["research.bills.search"].request;
  const detail = researchBillOperations["research.bills.detail"].request;

  it("accepts discovery filters with no query at all (browsing a jurisdiction)", () => {
    expect(search.safeParse({ query: { jurisdiction: "US", limit: 25 } }).success).toBe(true);
    expect(search.safeParse({ query: { session: "119", status: "reported" } }).success).toBe(true);
  });

  it("refuses a one-character search instead of scanning a legislative catalog", () => {
    expect(search.safeParse({ query: { q: "H" } }).success).toBe(false);
    expect(search.safeParse({ query: { q: "HR" } }).success).toBe(true);
  });

  it("refuses unknown query keys rather than silently dropping a filter", () => {
    expect(search.safeParse({ query: { q: "HR 8800", tenantId: "x" } }).success).toBe(false);
  });

  it("only accepts the two canonical bill kinds for detail", () => {
    expect(detail.safeParse({ params: { kind: "federal_bill", billId: "119-hr-8800" } }).success).toBe(
      true,
    );
    expect(detail.safeParse({ params: { kind: "state_bill", billId: "CA-20252026-HB123" } }).success).toBe(
      true,
    );
    expect(detail.safeParse({ params: { kind: "program", billId: "119-hr-8800" } }).success).toBe(false);
  });

  it("carries the server identifier verbatim, including the session-qualified state id", () => {
    const parsed = detail.safeParse({
      params: { kind: "state_bill", billId: "TX-20252026-HB123" },
    });
    expect(parsed.success && parsed.data.params.billId).toBe("TX-20252026-HB123");
  });
});

describe("bill membership and events on the shared schemas", () => {
  const member = {
    id: "member-1",
    targetKind: "federal_bill",
    targetId: "119-hr-8800",
    label: "H.R. 8800 — Defense Appropriations",
    disposition: "included",
    origin: "manual",
    reason: null,
    facts: { status: "reported", fundingBasis: "not_applicable" },
    revision: 3,
    updatedAt: "2026-10-29T00:00:00.000Z",
  };

  it("accepts a bill member with its captured legislative facts", () => {
    expect(researchMember.safeParse(member).success).toBe(true);
    expect(researchMember.safeParse({ ...member, targetKind: "state_bill" }).success).toBe(true);
  });

  it("still accepts a pre-fact-capture member without inventing facts", () => {
    const { facts, ...legacy } = member;
    expect(facts).toBeDefined();
    expect(researchMember.safeParse(legacy).success).toBe(true);
  });

  it("accepts an unresolved bill member without a canonical identity", () => {
    expect(
      researchMember.safeParse({
        ...member,
        targetKind: "state_bill",
        targetId: "unresolved:HB 123",
        disposition: "unresolved",
        unresolvedInput: { jurisdiction: "CA", session: "2025-2026", number: "HB123" },
        facts: null,
      }).success,
    ).toBe(true);
  });

  it("accepts a source-authored bill_changed event with no user actor", () => {
    expect(
      researchEvent.safeParse({
        id: "event-1",
        eventKind: "bill_changed",
        aggregateRevision: 4,
        actorUserId: null,
        actorKind: "system",
        occurredAt: "2026-10-29T00:00:00.000Z",
        payload: { targetId: "119-hr-8800", changeType: "status" },
      }).success,
    ).toBe(true);
  });
});
