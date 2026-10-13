import { expect, type Page } from "@playwright/test";
import { json, prospectId } from "./fixtures";
import { prospectDetail } from "./acceptance-prospect-fixtures";
import {
  sectionKeys,
  type BriefVersion,
  type CurrentBrief,
  type RefreshProposal,
} from "../../src/features/portfolio/prospects/brief/contracts";

export const briefBase = `**/business-development/prospects/${prospectId}/brief`;
export const briefTitle = "Synthetic current-read strategy brief";
export const briefCitation = {
  sourceFamily: "sam_entity",
  recordId: "synthetic-current-read-evidence",
  locator: "https://example.test/immutable-source",
  originalSourceName: "Synthetic registry",
  originalSourceId: "synthetic-registration",
  eventDate: "2026-10-01",
  sourceUpdatedAt: "2026-10-02",
  retrievedAt: "2026-10-03",
  title: "Saved immutable source label",
  relationshipStrength: "direct",
  stage: null,
};

export function briefVersion(
  number: number,
  text = "Original saved version text",
): BriefVersion {
  const section = {
    text,
    provenance: "generated" as const,
    citationIndexes: [0],
  };
  return {
    id: `acceptance-brief-version-${number}`,
    versionNumber: number,
    createdAt: "2026-10-13T12:00:00Z",
    createdByUserId: "user-test",
    sectionsHash: `synthetic-sections-${number}`,
    citationCount: 1,
    citations: [briefCitation],
    snapshotHash: `synthetic-snapshot-${number}`,
    sourceSnapshot: {
      generatedAt: "2026-10-13T11:00:00Z",
      identityBasis: "Synthetic registry identity",
      canonicalEntityId: null,
      canonicalName: "Test Prospect",
      evidence: [],
    },
    sections: {
      companyAndFirmImplication: section,
      verifiedEvidence: { ...section, text: "Saved evidence text" },
      judgment: { ...section, text: "Saved judgment text" },
      practicalAction: { ...section, text: "Saved action text" },
      missingInformation: { ...section, text: "Saved information gap" },
    },
  };
}

export function savedBrief(version = briefVersion(2)): CurrentBrief {
  return {
    brief: {
      id: "synthetic-current-read-brief",
      tenantId: "tenant-test",
      prospectId,
      title: briefTitle,
      status: "draft",
      currentVersionNumber: version.versionNumber,
      currentVersionId: version.id,
      createdAt: "2026-10-13T11:00:00Z",
      updatedAt: version.createdAt,
      createdByUserId: "user-test",
    },
    currentVersion: version,
  };
}

export function briefRefresh(text: string): RefreshProposal {
  const version = briefVersion(2);
  return {
    baseVersionNumber: 2,
    proposed: version.sections,
    diff: sectionKeys.map((section) => ({
      section,
      changed: section === "judgment",
      baseText: version.sections[section].text,
      proposedText:
        section === "judgment" ? text : version.sections[section].text,
    })),
    sourceSnapshot: version.sourceSnapshot,
    snapshotHash: "synthetic-comparison-snapshot",
  };
}

export function currentResolution(title: string) {
  return {
    resolvable: true,
    citation: briefCitation,
    sourceSnapshotEvidence: null,
    currentDossierEvidence: {
      ...briefCitation,
      title,
      claimType: "identity",
      effectiveDate: null,
      fiscalYear: null,
      fetchedAt: briefCitation.retrievedAt,
      scopeChecked: "Synthetic current registry scope",
      status: "available",
      detail: {},
    },
  };
}

export async function installSavedBrief(page: Page) {
  await page.route(briefBase, (route) => json(route, savedBrief()));
}

export async function openSavedBrief(page: Page) {
  await page.goto(prospectDetail);
  await page.getByRole("button", { name: "Open brief", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: briefTitle, exact: true });
  await expect(
    dialog.getByRole("article", { name: "Saved brief version 2", exact: true }),
  ).toBeVisible();
  return dialog;
}
