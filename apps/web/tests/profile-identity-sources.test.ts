import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  candidateSelection,
  confirmSourceIdentity,
  identityCandidates,
  identitySelectionName,
  identitySelectionKey,
  identityPreviewSchema,
  previewProfileIdentity,
} from "../src/features/portfolio/profile-build/identity";
import { IdentityMatch } from "../src/features/portfolio/profile-build/IdentityMatch";
const requestId = "10000000-0000-4000-8000-000000000001";
const canonicalEntityId = "10000000-0000-4000-8000-000000000002";
const attachmentId = "10000000-0000-4000-8000-000000000003";
const sourceCandidate = {
  source: "sam" as const,
  externalId: "ABC123DEF456",
  name: "Synthetic Company Inc.",
};
const claim = {
  kind: "former_name" as const,
  name: "Synthetic Prior Company",
  sourceUrl: "https://example.test/about",
  quote: "Synthetic Company Inc. was formerly Synthetic Prior Company.",
};
const preview = () =>
  identityPreviewSchema.parse({
    status: "ambiguous",
    entity: null,
    candidates: [
      {
        entity: { id: null, canonicalName: sourceCandidate.name },
        sourceCandidate,
        claims: [claim],
        reasons: ["Exact sourced company name"],
      },
    ],
    duplicate: null,
    sourceGaps: ["No SEC match was available."],
  });
it("preserves newly sourced identities without fabricating a canonical identifier", () => {
  const choice = candidateSelection(identityCandidates(preview())[0]!);
  expect(choice).toEqual({ sourceCandidate, claims: [] });
  expect(choice).not.toHaveProperty("canonicalEntityId");
  expect(
    identityPreviewSchema.safeParse({
      ...preview(),
      candidates: [{ entity: { id: null, canonicalName: "Unsupported name" } }],
    }).success,
  ).toBe(false);
});
it("keeps different company names from the same source separately selectable", () => {
  const candidates = ["Synthetic Parent", "Synthetic Subsidiary"].map(
    (name) => ({
      entity: { id: null, canonicalName: name },
      sourceCandidate: { source: "document", externalId: attachmentId, name },
      evidence: [
        {
          label: "Uploaded source",
          attachmentId,
          source: "profile_identity",
          excerpt: `The company is ${name}.`,
          observedAt: "2026-01-01T00:00:00Z",
        },
      ],
    }),
  );
  const result = identityPreviewSchema.parse({
    ...preview(),
    entity: candidates[0]!.entity,
    sourceCandidate: candidates[0]!.sourceCandidate,
    candidates,
  });
  const rows = identityCandidates(result);
  expect(rows).toHaveLength(2);
  expect(rows[0]?.evidence).toEqual(candidates[0]!.evidence);
  expect(identitySelectionKey(candidateSelection(rows[0]!))).not.toBe(
    identitySelectionKey(candidateSelection(rows[1]!)),
  );
  const html = renderToStaticMarkup(
    createElement(IdentityMatch, {
      preview: result,
      selected: candidateSelection(rows[1]!),
      onSelect: vi.fn(),
    }),
  );
  expect(html.match(/type="radio"[^>]*checked/g)).toHaveLength(1);
  expect(html).toContain("Synthetic Parent");
  expect(html).toContain("Synthetic Subsidiary");
});
it("requires individual confirmation of source-quoted aliases and relationships", () => {
  const selected = candidateSelection(preview().candidates[0]!);
  const html = renderToStaticMarkup(
    createElement(IdentityMatch, {
      preview: preview(),
      selected,
      onSelect: vi.fn(),
    }),
  );
  expect(html).toContain("SAM.gov");
  expect(html).toContain(claim.quote);
  expect(html).toContain("Confirm former name");
  expect(html).toContain("No SEC match was available.");
  expect(html.match(/type="checkbox"[^>]*checked/g)).toBeNull();
});
it("uses a source-derived name for nameless entry and cannot invent a separate company", () => {
  const result = preview();
  const selected = candidateSelection(result.candidates[0]!);
  expect(identitySelectionName(result, selected)).toBe(sourceCandidate.name);
  expect(identitySelectionName(result, null)).toBeUndefined();
  const html = renderToStaticMarkup(
    createElement(IdentityMatch, {
      preview: result,
      selected,
      onSelect: vi.fn(),
      allowSeparate: false,
    }),
  );
  expect(html).not.toContain("create a separate profile");
  expect(html).toContain("enter its legal name");
});
it("preserves primary company evidence and document-backed claims without inventing source URLs", () => {
  const documentClaim = {
    kind: "alias",
    name: "Document alias",
    attachmentId,
    quote: "The company is also known as Document alias.",
  };
  const evidence = {
    label: "Uploaded identity.txt",
    attachmentId,
    excerpt: "Synthetic Company Inc. is the legal company name.",
    observedAt: "2026-01-01T00:00:00Z",
    source: "profile_identity",
  };
  const result = identityPreviewSchema.parse({
    ...preview(),
    candidates: [
      {
        ...preview().candidates[0]!,
        sourceCandidate: {
          source: "document",
          externalId: attachmentId,
          name: sourceCandidate.name,
        },
        claims: [documentClaim],
        evidence: [evidence],
      },
    ],
  });
  const html = renderToStaticMarkup(
    createElement(IdentityMatch, {
      preview: result,
      selected: candidateSelection(result.candidates[0]!),
      onSelect: vi.fn(),
    }),
  );
  expect(result.candidates[0]?.claims).toEqual([documentClaim]);
  expect(html).toContain(evidence.excerpt);
  expect(html).toContain(documentClaim.quote);
  expect(html).toContain("Quoted from the uploaded identity document");
  expect(html).not.toContain('href="undefined"');
});
it("retains canonical-only identity compatibility and removes a duplicated primary candidate", () => {
  const entity = {
    id: canonicalEntityId,
    canonicalName: "Saved canonical company",
  };
  const result = identityPreviewSchema.parse({
    status: "exact",
    entity,
    candidates: [{ entity, confidence: 1 }],
    duplicate: null,
  });
  expect(identityCandidates(result)).toHaveLength(1);
  expect(candidateSelection(identityCandidates(result)[0]!)).toEqual({
    canonicalEntityId,
  });
});
it("sends a document-only preview without an invented name or a profile create", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(preview()));
  await previewProfileIdentity(createApiClient(fetcher), { attachmentId });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toContain(
    "profile-build/identity-preview",
  );
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
    attachmentId,
  });
});
it("confirms only the selected source and claims before exposing the canonical create binding", async () => {
  const command = { requestId, sourceCandidate, claims: [claim] };
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      requestId,
      canonicalEntityId,
      sourceCandidate,
    }),
  );
  const result = await confirmSourceIdentity(createApiClient(fetcher), command);
  expect(result.canonicalEntityId).toBe(canonicalEntityId);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toContain(
    "profile-build/identity-confirm",
  );
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(command);
});
it.each([
  { requestId: attachmentId, canonicalEntityId, sourceCandidate },
  {
    requestId,
    canonicalEntityId,
    sourceCandidate: { ...sourceCandidate, externalId: "other" },
  },
  { requestId, canonicalEntityId: null, sourceCandidate },
])(
  "rejects mismatched or incomplete confirmation receipts",
  async (receipt) => {
    await expect(
      confirmSourceIdentity(
        createApiClient(async () => Response.json(receipt)),
        { requestId, sourceCandidate, claims: [] },
      ),
    ).rejects.toThrow("unexpected response");
  },
);
