import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  portfolioProposalSchema,
  proposalInputSchema,
  canBulkApprove,
  hasOfficialEvidence,
  officePayloadSchema,
} from "../src/features/portfolio/capabilities/proposal-contracts";
import {
  portfolioDepthSchema,
  trackingFeedSchema,
  supportSchema,
} from "../src/features/portfolio/capabilities/depth-contracts";
import {
  memberCaseFields,
  replaceableCaseFields,
} from "../src/features/portfolio/capabilities/CaseForSupport";
import { ProposalEvidence } from "../src/features/portfolio/capabilities/ProposalEvidence";
import { OfficeRelationshipCard } from "../src/features/portfolio/relationships/OfficeRelationshipCard";
import {
  relationshipGaps,
  filterOfficeRelationships,
} from "../src/features/portfolio/relationships/relationship-coverage";

const id = "10000000-0000-4000-8000-000000000001";
const otherId = "10000000-0000-4000-8000-000000000002";
const evidence = [
  {
    title: "Synthetic test evidence",
    excerpt: "Synthetic fixture passage; no real-world factual claim.",
    observedAt: "2026-01-01T00:00:00.000Z",
    sourceType: "official" as const,
    url: "https://example.gov/source",
  },
];
const metadata = {
  id,
  capabilityId: id,
  status: "proposed",
  version: 1,
  evidence,
};
const alignment = (targetType = "tag", score = 86) =>
  portfolioProposalSchema.parse({
    ...metadata,
    kind: "alignment",
    payload: {
      targetType,
      value: "Synthetic term",
      rationale: "Synthetic matching rationale",
      score,
    },
  });
const caseRow = (overrides = {}) =>
  portfolioProposalSchema.parse({
    ...metadata,
    kind: "case_field",
    status: "approved",
    payload: {
      field: "impact",
      text: "Synthetic fixture impact description",
      memberId: "SYNTHETIC",
      sourceDirectory: "congress",
      officeTerm: "119",
    },
    ...overrides,
  });

describe("sourced portfolio review contracts", () => {
  it("retains sources and review version after approval", () => {
    const row = portfolioProposalSchema.parse({
      ...alignment(),
      status: "approved",
      version: 2,
    });
    expect(row.evidence).toEqual(evidence);
    expect(row.version).toBe(2);
    expect(
      renderToStaticMarkup(
        createElement(ProposalEvidence, { evidence: row.evidence }),
      ),
    ).toContain("https://example.gov/source");
  });
  it.each(["pe", "program"])(
    "never permits bulk approval of %s even with a high score",
    (type) => {
      expect(canBulkApprove(alignment(type, 100))).toBe(false);
    },
  );
  it("uses above 85 eligibility, excludes rejected or unsourced proposals", () => {
    expect(canBulkApprove(alignment("tag", 85))).toBe(false);
    expect(canBulkApprove(alignment("tag", 86))).toBe(true);
    expect(
      canBulkApprove(
        portfolioProposalSchema.parse({ ...alignment(), status: "rejected" }),
      ),
    ).toBe(false);
    expect(
      canBulkApprove(
        portfolioProposalSchema.parse({ ...alignment(), evidence: [] }),
      ),
    ).toBe(false);
  });
  it("rejects javascript evidence and source-free input", () => {
    const input = {
      kind: "alignment",
      capabilityId: id,
      payload: {
        targetType: "tag",
        value: "Synthetic",
        rationale: "Synthetic rationale",
      },
      evidence,
    };
    expect(
      proposalInputSchema.safeParse({ ...input, evidence: [] }).success,
    ).toBe(false);
    expect(
      proposalInputSchema.safeParse({
        ...input,
        evidence: [{ ...evidence[0]!, url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });
  it("requires an official government URL for a sourced office recommendation", () => {
    expect(hasOfficialEvidence(evidence)).toBe(true);
    expect(
      hasOfficialEvidence([{ ...evidence[0]!, sourceType: "company" }]),
    ).toBe(false);
    expect(
      hasOfficialEvidence([
        { ...evidence[0]!, url: "https://example.test/post" },
      ]),
    ).toBe(false);
  });
  it("retains generated office fit ratings and accepts legacy proposals without a rating", () => {
    const office = {
      memberId: "SYNTHETIC",
      sourceDirectory: "congress",
      officeTerm: "119",
      rationale: "Synthetic fit evidence",
      entryPoint: "Synthetic entry point",
      whyNot: "Synthetic limitation",
      suggestedOwnerUserId: otherId,
    };
    expect(
      officePayloadSchema.parse({ ...office, fitRating: "strong" }),
    ).toMatchObject({ fitRating: "strong", suggestedOwnerUserId: otherId });
    expect(officePayloadSchema.parse(office)).not.toHaveProperty("fitRating");
    expect(
      officePayloadSchema.safeParse({ ...office, fitRating: "guaranteed" })
        .success,
    ).toBe(false);
  });
  it("keeps sector anchors typed and validates their maturity chain", () => {
    const base = { kind: "sector_anchor", capabilityId: id, evidence };
    expect(
      proposalInputSchema.safeParse({
        ...base,
        payload: {
          sector: "health",
          agency: "Synthetic agency",
          account: "Synthetic account",
          program: "Synthetic program",
          maturity: { current: "research", steps: ["research", "trial"] },
        },
      }).success,
    ).toBe(true);
    expect(
      proposalInputSchema.safeParse({
        ...base,
        payload: {
          sector: "defense",
          agency: "Synthetic agency",
          maturity: { current: "fielded", steps: ["research"] },
        },
      }).success,
    ).toBe(false);
  });
  it("keeps member-specific facts scoped to capability, office directory and term", () => {
    expect(
      memberCaseFields([caseRow()], id, "SYNTHETIC", "congress", "119"),
    ).toHaveLength(1);
    expect(
      memberCaseFields([caseRow()], id, "SYNTHETIC", "congress", "120"),
    ).toEqual([]);
    expect(
      memberCaseFields([caseRow()], id, "SYNTHETIC", "state", "119"),
    ).toEqual([]);
    expect(
      memberCaseFields([caseRow()], otherId, "SYNTHETIC", "congress", "119"),
    ).toEqual([]);
    expect(
      memberCaseFields(
        [caseRow({ status: "proposed" })],
        id,
        "SYNTHETIC",
        "congress",
        "119",
      ),
    ).toEqual([]);
    expect(
      memberCaseFields(
        [caseRow({ evidence: [] })],
        id,
        "SYNTHETIC",
        "congress",
        "119",
      ),
    ).toEqual([]);
  });
  it("only offers case replacement in the same field and office scope without a site binding", () => {
    const general = caseRow({
      id: otherId,
      payload: { field: "impact", text: "Synthetic whole-capability fact" },
    });
    const atSite = caseRow({
      payload: {
        field: "impact",
        text: "Synthetic site fact",
        facilityId: otherId,
        memberId: "SYNTHETIC",
        sourceDirectory: "congress",
        officeTerm: "119",
      },
    });
    const proposals = [caseRow(), general, atSite];
    expect(
      replaceableCaseFields(
        proposals,
        id,
        "impact",
        "SYNTHETIC",
        "congress",
        "119",
      ),
    ).toEqual([caseRow()]);
    expect(replaceableCaseFields(proposals, id, "impact")).toEqual([general]);
    expect(
      replaceableCaseFields(
        proposals,
        id,
        "cost",
        "SYNTHETIC",
        "congress",
        "119",
      ),
    ).toEqual([]);
  });
  it("retains current support when a historical source has become inaccessible", () => {
    const result = supportSchema.parse({
      id,
      targetId: otherId,
      capabilityId: id,
      stance: "supportive",
      evidence,
      approvedAt: "2026-01-01T00:00:00Z",
      version: 2,
      history: [
        {
          stance: "interested",
          previousStance: null,
          at: "2025-12-01T00:00:00Z",
          sourceUnavailable: true,
        },
      ],
    });
    expect(result.evidence).toEqual(evidence);
    expect(result.history[0]).toMatchObject({
      sourceUnavailable: true,
      evidence: [],
    });
  });
  it("accepts a feed identity from a real unsaved source without treating it as a UUID", () => {
    const result = trackingFeedSchema.parse({
      items: [
        {
          id: "bill:synthetic",
          capabilityId: id,
          itemKind: "bill",
          itemId: "synthetic",
          status: "active",
          termIds: [id],
          title: "Synthetic bill fixture",
          url: "https://example.gov/bill",
          occurredAt: evidence[0]!.observedAt,
          dateKind: "published",
          explanation: "Matches approved synthetic term",
        },
      ],
      pending: [],
      terms: [],
      clientTrackingPreserved: true,
      sourceStatus: "ready",
      gaps: [],
      truncated: false,
    });
    expect(result.items[0]?.id).toBe("bill:synthetic");
    expect(result.clientTrackingPreserved).toBe(true);
  });
  it("requires every canonical depth section rather than inventing missing arrays", () => {
    expect(
      portfolioDepthSchema.safeParse({ capabilities: [], proposals: [] })
        .success,
    ).toBe(false);
  });
});

describe("two-level relationship coverage", () => {
  const relationship = {
    id,
    memberId: "SYNTHETIC",
    sourceDirectory: "congress" as const,
    relationshipStatus: "planned" as const,
    ownerUserId: null,
    lastContactAt: null,
    nextStep: null,
    stance: "unknown",
    officeTerm: "119",
    version: 1,
  };
  const capability = { id: otherId, name: "Synthetic capability" };
  it("preserves an unrecorded stance on a proposed office and its canonical capability link", () => {
    const proposal = officePayloadSchema.parse({
      memberId: "SYNTHETIC",
      sourceDirectory: "congress",
      officeTerm: "119",
      rationale: "Synthetic geography fit",
      entryPoint: "Synthetic committee context",
      whyNot: "No contact recorded",
    });
    expect(proposal.stance).toBe("unknown");
    const support = supportSchema.parse({
      id: otherId,
      targetId: id,
      capabilityId: otherId,
      stance: "unknown",
      evidence,
      approvedAt: "2026-01-01T00:00:00Z",
      version: 1,
    });
    const html = renderToStaticMarkup(
      createElement(OfficeRelationshipCard, {
        relationship,
        supports: [support],
        capabilities: [capability],
        onOpen: () => {},
        onEdit: () => {},
        onSupport: () => {},
        onBrief: () => {},
      }),
    );
    expect(html).toContain("No support stance recorded");
    expect(html).not.toContain("interested");
    expect(
      officePayloadSchema.parse({ ...proposal, stance: "interested" }).stance,
    ).toBe("interested");
  });
  const support = {
    id: otherId,
    targetId: id,
    capabilityId: otherId,
    stance: "interested" as const,
    evidence,
    approvedAt: evidence[0]!.observedAt,
    version: 1,
    history: [],
  };
  it("keeps a client-only office and capability without office as separate gaps", () => {
    expect(relationshipGaps([relationship], [capability], [])).toEqual({
      officesWithoutCapabilities: [relationship],
      capabilitiesWithoutOffices: [capability],
    });
    expect(relationshipGaps([relationship], [capability], [support])).toEqual({
      officesWithoutCapabilities: [],
      capabilitiesWithoutOffices: [],
    });
  });
  it("does not count an orphan support as office coverage", () => {
    expect(
      relationshipGaps([], [capability], [support]).capabilitiesWithoutOffices,
    ).toEqual([capability]);
  });
  it("filters capability support beneath its parent link", () => {
    expect(
      filterOfficeRelationships([relationship], [], [support], {
        capability: otherId,
        status: "planned",
        geography: "",
        owner: "",
      }),
    ).toEqual([relationship]);
    expect(
      filterOfficeRelationships([relationship], [], [support], {
        capability: id,
        status: "",
        geography: "",
        owner: "",
      }),
    ).toEqual([]);
  });
});
