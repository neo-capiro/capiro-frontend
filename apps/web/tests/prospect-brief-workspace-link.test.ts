import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ isSuccess: false, isPending: true }),
}));
vi.mock("@/shared/portfolio/ui/Dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => children,
}));
import { BriefViewer } from "../src/features/portfolio/prospects/brief/BriefViewer";
import {
  sectionKeys,
  sectionsSchema,
  type CurrentBrief,
} from "../src/features/portfolio/prospects/brief/contracts";

const prospectId = "10000000-0000-4000-8000-000000000001";
const tenantId = "10000000-0000-4000-8000-000000000002";
const briefId = "10000000-0000-4000-8000-000000000003";
const versionId = "10000000-0000-4000-8000-000000000004";
const version: NonNullable<CurrentBrief["currentVersion"]> = {
  id: versionId,
  versionNumber: 2,
  createdAt: "2026-10-13T00:00:00Z",
  createdByUserId: null,
  sectionsHash: "a".repeat(64),
  snapshotHash: "b".repeat(64),
  citationCount: 0,
  citations: [],
  sections: sectionsSchema.parse(
    Object.fromEntries(
      sectionKeys.map((key) => [
        key,
        {
          text: `Saved ${key}`,
          provenance: "edited",
          citationIndexes: [],
        },
      ]),
    ),
  ),
  sourceSnapshot: {
    generatedAt: "2026-10-13T00:00:00Z",
    identityBasis: "Synthetic source",
    canonicalEntityId: null,
    canonicalName: null,
    evidence: [],
  },
};
const data: CurrentBrief = {
  brief: {
    id: briefId,
    tenantId,
    prospectId,
    title: "Synthetic saved brief",
    status: "draft",
    currentVersionId: versionId,
    currentVersionNumber: 2,
    createdAt: version.createdAt,
    updatedAt: version.createdAt,
    createdByUserId: null,
  },
  currentVersion: version,
};
const render = (value = data) =>
  renderToStaticMarkup(
    createElement(BriefViewer, {
      scope: { tenantId, prospectId },
      data: value,
      onClose: () => {},
    }),
  );

describe("saved Core brief to independent Workspace copy", () => {
  it("offers an explicit destination link pinned to every exact saved source field", () => {
    const html = render();
    const href = html.match(/href="([^"]+)"[^>]*>Copy to Workspace<\/a>/)?.[1];
    expect(
      href,
      "saved brief must offer the approved independent-copy workflow",
    ).toBeDefined();
    const url = new URL(
      href!.replaceAll("&amp;", "&"),
      "http://synthetic.local",
    );
    expect(url.pathname).toBe("/modules/workspace");
    expect(url.searchParams.get("prospectId")).toBe(prospectId);
    expect(JSON.parse(url.searchParams.get("briefSource")!)).toEqual({
      kind: "core_prospect_brief_version",
      prospectId,
      briefId,
      versionId,
      versionNumber: 2,
      sectionsHash: version.sectionsHash,
      snapshotHash: version.snapshotHash,
    });
    expect(html).toContain("Core stays unchanged");
  });
  it("does not guess a source identity from an incomplete saved version", () => {
    const html = render({
      ...data,
      currentVersion: { ...version, snapshotHash: "legacy-unqualified-hash" },
    });
    expect(html).not.toContain(">Copy to Workspace</a>");
  });
  it("does not provide a source for an absent saved version", () => {
    expect(render({ brief: null, currentVersion: null })).not.toContain(
      ">Copy to Workspace</a>",
    );
  });
});
